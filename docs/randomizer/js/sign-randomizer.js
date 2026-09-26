import { readBooleanAttribute,
	readNumberAttribute,
	readStringAttribute,
	writeNumberAttribute } from './dom.js';
import { getIndex,
	getSign,
	getSigns,
	whenReady } from './sign-data.js';
import { MODES,
	readExcludedSignIds,
	readFavoriteSignIds,
	readMode,
	writeExcludedSignIds,
	writeFavoriteSignIds,
	writeMode } from './storage.js';

const SIGN_ID_PARAM = 'vgt-sign-id';
const FAVORITE_PARAM = 'vgt-favorite';
const EXCLUDED_PARAM = 'vgt-excluded';

function readFragmentParams() {
	const searchParams = new URLSearchParams( location.hash.replace( /^#/, '' ) );
	const params = new Map();

	for ( const [ name, value ] of searchParams ) {
		const values = params.get( name ) ?? [];

		values.push( value );
		params.set( name, values );
	}

	return params;
}

function writeFragmentParams( params, push ) {
	const searchParams = new URLSearchParams();

	for ( const [ name, values ] of params ) {
		for ( const value of values ) {
			searchParams.append( name, value );
		}
	}

	const query = searchParams.toString();
	const hash = query ? `#${query}` : '';

	if ( location.hash === hash ) {
		return;
	}

	const url = `${location.pathname}${location.search}${hash}`;

	if ( push ) {
		history.pushState( null, '', url );

		return;
	}

	history.replaceState( null, '', url );
}

function readSignIdFromLocation() {
	const signId = Number( readFragmentParams().get( SIGN_ID_PARAM )?.[0] );

	if ( !Number.isInteger( signId ) || signId <= 0 ) {
		return null;
	}

	return signId;
}

function readSignIdsFromLocation( name ) {
	const values = readFragmentParams().get( name );

	if ( !values ) {
		return null;
	}

	const ids = values
		.flatMap( ( value ) => {
			return value.split( ',' );
		} )
		.map( Number )
		.filter( ( value ) => {
			return Number.isInteger( value ) && value > 0;
		} );

	return new Set( ids );
}

export class SignRandomizer extends HTMLElement {
	static get observedAttributes() {
		return [
			'data-sign-id',
			'data-mode',
			'data-only-favorites',
		];
	}

	get signId() {
		return readNumberAttribute( this, 'data-sign-id' );
	}

	set signId( value ) {
		writeNumberAttribute( this, 'data-sign-id', value );
	}

	get mode() {
		const mode = readStringAttribute( this, 'data-mode', MODES );

		if ( !mode ) {
			return 'learn';
		}

		return mode;
	}

	set mode( value ) {
		this.setAttribute( 'data-mode', value );
	}

	get onlyFavorites() {
		return readBooleanAttribute( this, 'data-only-favorites' );
	}

	set onlyFavorites( value ) {
		if ( value ) {
			this.setAttribute( 'data-only-favorites', '' );

			return;
		}

		this.removeAttribute( 'data-only-favorites' );
	}

	get viewerEl() {
		return this.querySelector( 'sign-viewer' );
	}

	get favoritesEl() {
		return this.querySelector( 'sign-favorites' );
	}

	#restoring = false;

	// Life cycle
	async connectedCallback() {
		this.mode = readMode();
		this.#renderModes();
		this.addEventListener( 'click', this.#clickHandler );
		this.addEventListener( 'variant-selected', this.#variantSelectedHandler );
		this.addEventListener( 'favorites-change', this.#favoritesChangeHandler );
		this.addEventListener( 'favorites-filter-change', this.#favoritesFilterChangeHandler );
		addEventListener( 'hashchange', this.#hashChangeHandler );
		addEventListener( 'keydown', this.#keydownHandler );

		try {
			await whenReady();
			this.#restoreFromLocation();
		} catch ( err ) {
			this.#showError( err );
		}
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
		this.removeEventListener( 'variant-selected', this.#variantSelectedHandler );
		this.removeEventListener( 'favorites-change', this.#favoritesChangeHandler );
		this.removeEventListener( 'favorites-filter-change', this.#favoritesFilterChangeHandler );
		removeEventListener( 'hashchange', this.#hashChangeHandler );
		removeEventListener( 'keydown', this.#keydownHandler );
	}

	attributeChangedCallback( attrName, oldVal, newVal ) {
		if ( oldVal === newVal ) {
			return;
		}

		if ( 'data-sign-id' === attrName ) {
			this.#syncLocation( !this.#restoring );
			this.dispatchEvent( new CustomEvent( 'sign-id-change', {
				bubbles: true,
				composed: true,
				detail: {
					signId: this.signId,
				},
			} ) );

			return;
		}

		if ( 'data-mode' === attrName ) {
			this.dispatchEvent( new CustomEvent( 'mode-change', {
				bubbles: true,
				composed: true,
				detail: {
					mode: this.mode,
				},
			} ) );
		}
	}

	#clickHandler = ( event ) => {
		const target = event.target;

		if ( target.closest( '#randomizer-next' ) ) {
			this.#next();

			return;
		}

		if ( target.closest( '#randomizer-exclude' ) ) {
			this.#excludeCurrent();

			return;
		}

		if ( target.closest( '#randomizer-share' ) ) {
			this.#share();

			return;
		}

		const modeBtn = target.closest( '.sign-randomizer__modes button' );

		if ( modeBtn && this.contains( modeBtn ) ) {
			this.#setMode( modeBtn.dataset.mode );
		}
	};

	#variantSelectedHandler = ( event ) => {
		event.stopPropagation();
		this.signId = event.detail.signId;
		this.#renderCurrent();
	};

	#favoritesChangeHandler = ( event ) => {
		event.stopPropagation();

		if ( this.onlyFavorites ) {
			this.#next();

			return;
		}

		this.#renderCurrent();
		this.#syncLocation( false );
	};

	#favoritesFilterChangeHandler = ( event ) => {
		event.stopPropagation();
		this.onlyFavorites = Boolean( event.detail.onlyFavorites );
		this.#next();
	};

	#hashChangeHandler = () => {
		this.#restoreFromLocation();
	};

	#keydownHandler = ( event ) => {
		if ( 'ArrowRight' !== event.key || !( event.metaKey || event.ctrlKey ) ) {
			return;
		}

		event.preventDefault();
		this.#next();
	};

	#pool() {
		const favoriteSignIds = readFavoriteSignIds();
		const excludedSignIds = readExcludedSignIds();

		if ( this.onlyFavorites ) {
			return [
				...favoriteSignIds,
			].map( ( signId ) => {
				return getSign( signId );
			} ).filter( Boolean );
		}

		return getSigns().filter( ( sign ) => {
			return !excludedSignIds.has( sign.signId );
		} );
	}

	#pick() {
		const candidates = this.#pool();

		if ( 0 === candidates.length ) {
			return null;
		}

		return candidates[Math.floor( Math.random() * candidates.length )];
	}

	#restoreFromLocation() {
		this.#restoring = true;

		try {
			const favoriteSignIds = readSignIdsFromLocation( FAVORITE_PARAM );
			const excludedSignIds = readSignIdsFromLocation( EXCLUDED_PARAM );

			if ( favoriteSignIds ) {
				writeFavoriteSignIds( favoriteSignIds );
			}

			if ( excludedSignIds ) {
				writeExcludedSignIds( excludedSignIds );
			}

			const signId = readSignIdFromLocation();

			if ( null !== signId && getSign( signId ) ) {
				this.signId = signId;
				this.#renderCurrent();

				return;
			}

			this.#next();
		} finally {
			this.#restoring = false;
		}
	}

	#share() {
		const params = readFragmentParams();
		const favoriteSignIds = [
			...readFavoriteSignIds(),
		].sort( ( a, b ) => {
			return a - b;
		} );
		const excludedSignIds = [
			...readExcludedSignIds(),
		].sort( ( a, b ) => {
			return a - b;
		} );

		if ( null === this.signId ) {
			params.delete( SIGN_ID_PARAM );
		} else {
			params.set( SIGN_ID_PARAM, [
				String( this.signId ),
			] );
		}

		if ( 0 === favoriteSignIds.length ) {
			params.delete( FAVORITE_PARAM );
		} else {
			params.set( FAVORITE_PARAM, favoriteSignIds.map( String ) );
		}

		if ( 0 === excludedSignIds.length ) {
			params.delete( EXCLUDED_PARAM );
		} else {
			params.set( EXCLUDED_PARAM, excludedSignIds.map( String ) );
		}

		writeFragmentParams( params, false );
	}

	#syncLocation( push ) {
		const params = this.#restoring ? readFragmentParams() : new Map();

		if ( null === this.signId ) {
			params.delete( SIGN_ID_PARAM );
		} else {
			params.set( SIGN_ID_PARAM, [
				String( this.signId ),
			] );
		}

		writeFragmentParams( params, push );
	}

	#next() {
		const sign = this.#pick();

		this.#syncLocation( false );

		if ( sign ) {
			this.signId = sign.signId;
		} else {
			this.signId = null;
		}

		this.#renderCurrent();
		this.#syncLocation( !this.#restoring );
	}

	#renderCurrent() {
		const viewerEl = this.viewerEl;

		if ( viewerEl ) {
			viewerEl.render();
		}

		const favoritesEl = this.favoritesEl;

		if ( favoritesEl ) {
			favoritesEl.render();
		}

		const excludeEl = this.querySelector( '#randomizer-exclude' );
		const nextEl = this.querySelector( '#randomizer-next' );
		const sign = getSign( this.signId );

		if ( excludeEl ) {
			excludeEl.disabled = !sign;
		}

		if ( nextEl ) {
			nextEl.disabled = 0 === this.#pool().length;
		}

		this.#renderCount();
	}

	#renderCount() {
		const countEl = this.querySelector( '[data-randomizer-count]' );

		if ( !countEl ) {
			return;
		}

		const favoriteSignIds = readFavoriteSignIds();
		const excludedSignIds = readExcludedSignIds();

		if ( this.onlyFavorites ) {
			const resolvable = [
				...favoriteSignIds,
			].filter( ( signId ) => {
				return Boolean( getSign( signId ) );
			} ).length;
			countEl.textContent = `favorieten: ${this.#pool().length} van ${resolvable} tekens`;

			return;
		}

		const index = getIndex();
		let total = 0;

		if ( index ) {
			total = index.signs.length;
		}

		countEl.textContent = `${this.#pool().length} van ${total} tekens beschikbaar · ${excludedSignIds.size} uitgesloten · ${favoriteSignIds.size} favorieten`;
	}

	#excludeCurrent() {
		if ( null === this.signId ) {
			return;
		}

		const excludedSignIds = readExcludedSignIds();
		excludedSignIds.add( this.signId );
		writeExcludedSignIds( excludedSignIds );
		this.#next();
	}

	#setMode( mode ) {
		this.mode = mode;
		writeMode( mode );
		this.#renderModes();

		const viewerEl = this.viewerEl;

		if ( viewerEl ) {
			viewerEl.render();
		}
	}

	#renderModes() {
		for ( const btn of this.querySelectorAll( '.sign-randomizer__modes button' ) ) {
			btn.setAttribute( 'aria-pressed', String( btn.dataset.mode === this.mode ) );
		}
	}

	#showError( err ) {
		const errorEl = this.querySelector( '[data-randomizer-error]' );

		if ( errorEl ) {
			errorEl.hidden = false;
			errorEl.textContent = `Kon de index niet laden: ${err.message}. Draai eerst "npm run index" en serveer de map via "npm run serve".`;
		}
	}
}

customElements.define( 'sign-randomizer', SignRandomizer );
