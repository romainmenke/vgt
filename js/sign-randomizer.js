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
	writeMode } from './storage.js';

function readSignIdFromLocation() {
	const match = /^#sign-(\d+)$/.exec( location.hash );

	if ( !match ) {
		return null;
	}

	return Number( match[1] );
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

	// Life cycle
	async connectedCallback() {
		this.mode = readMode();
		this.#renderModes();
		this.addEventListener( 'click', this.#clickHandler );
		this.addEventListener( 'variant-selected', this.#variantSelectedHandler );
		this.addEventListener( 'favorites-change', this.#favoritesChangeHandler );
		this.addEventListener( 'favorites-filter-change', this.#favoritesFilterChangeHandler );

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
	}

	attributeChangedCallback( attrName, oldVal, newVal ) {
		if ( oldVal === newVal ) {
			return;
		}

		if ( 'data-sign-id' === attrName ) {
			this.#syncLocation();
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
	};

	#favoritesFilterChangeHandler = ( event ) => {
		event.stopPropagation();
		this.onlyFavorites = Boolean( event.detail.onlyFavorites );
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
		const signId = readSignIdFromLocation();

		if ( null !== signId && getSign( signId ) ) {
			this.signId = signId;
			this.#renderCurrent();

			return;
		}

		this.#next();
	}

	#syncLocation() {
		const signId = this.signId;
		const hash = null === signId ? '' : `#sign-${signId}`;

		if ( location.hash === hash ) {
			return;
		}

		history.replaceState( null, '', `${location.pathname}${location.search}${hash}` );
	}

	#next() {
		const sign = this.#pick();

		if ( sign ) {
			this.signId = sign.signId;
		} else {
			this.signId = null;
		}

		this.#renderCurrent();
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
