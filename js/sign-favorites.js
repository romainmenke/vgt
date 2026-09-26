import { closestRandomizer } from './dom.js';
import { readFavoriteSignIds,
	writeFavoriteSignIds } from './storage.js';

export class SignFavorites extends HTMLElement {
	get toggleEl() {
		return this.querySelector( '#favorites-toggle' );
	}

	get filterEl() {
		return this.querySelector( '#favorites-filter' );
	}

	#currentSignId() {
		const randomizerEl = closestRandomizer( this );

		if ( !randomizerEl ) {
			return null;
		}

		return randomizerEl.signId;
	}

	#onlyFavorites() {
		const randomizerEl = closestRandomizer( this );

		if ( !randomizerEl ) {
			return false;
		}

		return randomizerEl.onlyFavorites;
	}

	// Life cycle
	connectedCallback() {
		this.addEventListener( 'click', this.#clickHandler );
		this.render();
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
	}

	#clickHandler = ( event ) => {
		const target = event.target;

		if ( target.closest( '#favorites-toggle' ) ) {
			event.preventDefault();
			this.#toggleCurrent();

			return;
		}

		if ( target.closest( '#favorites-filter' ) ) {
			event.preventDefault();
			this.#toggleFilter();
		}
	};

	render() {
		const signId = this.#currentSignId();
		const favoriteSignIds = readFavoriteSignIds();
		const toggleEl = this.toggleEl;

		if ( toggleEl ) {
			const isFavorite = null !== signId && favoriteSignIds.has( signId );

			if ( isFavorite ) {
				toggleEl.textContent = '★ Favoriet';
			} else {
				toggleEl.textContent = '☆ Favoriet';
			}

			toggleEl.setAttribute( 'aria-pressed', String( isFavorite ) );
			toggleEl.disabled = null === signId;
		}

		const filterEl = this.filterEl;

		if ( filterEl ) {
			const onlyFavorites = this.#onlyFavorites();
			filterEl.setAttribute( 'aria-pressed', String( onlyFavorites ) );
		}
	}

	#toggleCurrent() {
		const signId = this.#currentSignId();

		if ( null === signId ) {
			return;
		}

		const favoriteSignIds = readFavoriteSignIds();

		if ( favoriteSignIds.has( signId ) ) {
			favoriteSignIds.delete( signId );
		} else {
			favoriteSignIds.add( signId );
		}

		writeFavoriteSignIds( favoriteSignIds );
		this.render();

		this.dispatchEvent( new CustomEvent( 'favorites-change', {
			bubbles: true,
			composed: true,
			detail: {
				signId: signId,
				isFavorite: favoriteSignIds.has( signId ),
			},
		} ) );
	}

	#toggleFilter() {
		const onlyFavorites = !this.#onlyFavorites();
		this.render();

		this.dispatchEvent( new CustomEvent( 'favorites-filter-change', {
			bubbles: true,
			composed: true,
			detail: {
				onlyFavorites: onlyFavorites,
			},
		} ) );
	}
}

customElements.define( 'sign-favorites', SignFavorites );
