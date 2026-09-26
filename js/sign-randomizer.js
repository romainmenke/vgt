import { closestLists,
	readNumberAttribute,
	readStringAttribute,
	writeNumberAttribute } from './dom.js';
import { getIndex,
	getSign,
	getSigns,
	whenReady } from './sign-data.js';
import { MODES,
	readExcludedSignIds,
	readMode,
	writeExcludedSignIds,
	writeMode } from './storage.js';

export class SignRandomizer extends HTMLElement {
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

	get viewerEl() {
		return this.querySelector( 'sign-viewer' );
	}

	get listsEl() {
		return this.querySelector( 'sign-lists' );
	}

	// Life cycle
	async connectedCallback() {
		this.mode = readMode();
		this.#renderModes();
		this.addEventListener( 'click', this.#clickHandler );
		this.addEventListener( 'variant-selected', this.#variantSelectedHandler );
		this.addEventListener( 'lists-change', this.#listsChangeHandler );

		try {
			await whenReady();
			this.#next();
		} catch ( err ) {
			this.#showError( err );
		}
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
		this.removeEventListener( 'variant-selected', this.#variantSelectedHandler );
		this.removeEventListener( 'lists-change', this.#listsChangeHandler );
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

	#listsChangeHandler = ( event ) => {
		event.stopPropagation();
		this.#next();
	};

	#pool() {
		const listsEl = closestLists( this );

		if ( listsEl ) {
			const listSignIds = listsEl.signIdsForActiveList();

			if ( listSignIds ) {
				return listSignIds.map( ( signId ) => {
					return getSign( signId );
				} ).filter( Boolean );
			}
		}

		const excludedSignIds = readExcludedSignIds();

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
		const signId = this.signId;
		const viewerEl = this.viewerEl;

		if ( viewerEl ) {
			viewerEl.render();
		}

		const listsEl = closestLists( this );

		if ( listsEl ) {
			listsEl.render();
		}

		const excludeEl = this.querySelector( '#randomizer-exclude' );
		const nextEl = this.querySelector( '#randomizer-next' );
		const sign = getSign( signId );

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

		const listsEl = closestLists( this );
		let list = null;

		if ( listsEl ) {
			list = listsEl.activeList();
		}

		if ( list ) {
			countEl.textContent = `lijst "${list.name}": ${this.#pool().length} van ${list.signIds.length} tekens`;

			return;
		}

		const excludedSignIds = readExcludedSignIds();
		const index = getIndex();
		let total = 0;

		if ( index ) {
			total = index.signs.length;
		}

		countEl.textContent = `${this.#pool().length} van ${total} tekens beschikbaar · ${excludedSignIds.size} uitgesloten`;
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
