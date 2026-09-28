import { getSign,
	whenReady } from './sign-data.js';
import { isDefaultFavoriteSignId,
	readFavoriteSignIds,
	writeFavoriteSignIds } from './storage.js';

const SID_PARAM = 'sid';

export function parseSignIds( text ) {
	const signIds = new Set();

	for ( const line of text.split( /\r?\n/ ) ) {
		const trimmed = line.trim();

		if ( '' === trimmed ) {
			continue;
		}

		let sid = null;

		try {
			sid = new URL( trimmed ).searchParams.get( SID_PARAM );
		} catch {
			// not a valid URL, fall through to a bare id
		}

		if ( null === sid && /^\d+$/.test( trimmed ) ) {
			sid = trimmed;
		}

		const signId = Number( sid );

		if ( Number.isInteger( signId ) && signId > 0 ) {
			signIds.add( signId );
		}
	}

	return signIds;
}

export class FavoritesManager extends HTMLElement {
	get formEl() {
		return this.querySelector( '[data-favorites-form]' );
	}

	get listEl() {
		return this.querySelector( '[data-favorites-list]' );
	}

	get inputEl() {
		return this.querySelector( '[data-favorites-input]' );
	}

	get statusEl() {
		return this.querySelector( '[data-favorites-status]' );
	}

	#favorites = new Set();

	// Life cycle
	async connectedCallback() {
		this.addEventListener( 'click', this.#clickHandler );

		const formEl = this.formEl;

		if ( formEl ) {
			formEl.addEventListener( 'submit', this.#submitHandler );
		}

		try {
			await whenReady();
			this.#favorites = readFavoriteSignIds();
			this.render();
		} catch ( err ) {
			this.#showStatus( `Kon de index niet laden: ${err.message}.`, true );
		}
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
		this.formEl?.removeEventListener( 'submit', this.#submitHandler );
	}

	#clickHandler = ( event ) => {
		const removeEl = event.target.closest( '[data-favorites-remove]' );

		if ( removeEl && this.contains( removeEl ) ) {
			event.preventDefault();
			this.#remove( Number( removeEl.dataset.favoritesRemove ) );
		}
	};

	#submitHandler = ( event ) => {
		event.preventDefault();
		this.#add();
	};

	render() {
		const listEl = this.listEl;

		if ( !listEl ) {
			return;
		}

		const items = [
			...this.#favorites,
		].map( ( signId ) => {
			return {
				signId: signId,
				sign: getSign( signId ),
			};
		} ).sort( ( a, b ) => {
			const nameA = a.sign?.glossName ?? `#${a.signId}`;
			const nameB = b.sign?.glossName ?? `#${b.signId}`;

			return nameA.localeCompare( nameB, 'nl' ) || a.signId - b.signId;
		} );

		if ( 0 === items.length ) {
			const empty = document.createElement( 'p' );
			empty.className = 'favorites-manager__empty';
			empty.textContent = 'Nog geen favorieten.';
			listEl.replaceChildren( empty );

			return;
		}

		listEl.replaceChildren( ...items.map( ( item ) => {
			return this.#renderItem( item.signId, item.sign );
		} ) );
	}

	#renderItem( signId, sign ) {
		const name = sign?.glossName ?? `#${signId}`;
		const item = document.createElement( 'li' );
		item.className = 'favorites-manager__item';

		const nameEl = document.createElement( sign ? 'a' : 'span' );
		nameEl.className = 'favorites-manager__name';
		nameEl.textContent = name;

		if ( sign ) {
			nameEl.href = `./index.html#vgt-sign-id=${signId}`;
		} else {
			nameEl.classList.add( 'favorites-manager__name--unknown' );
		}

		if ( isDefaultFavoriteSignId( signId ) ) {
			item.classList.add( 'favorites-manager__item--default' );

			const badgeEl = document.createElement( 'span' );
			badgeEl.className = 'favorites-manager__badge';
			badgeEl.textContent = 'Standaard';

			item.append( nameEl, badgeEl );

			return item;
		}

		const removeEl = document.createElement( 'button' );
		removeEl.type = 'button';
		removeEl.className = 'favorites-manager__remove';
		removeEl.dataset.favoritesRemove = String( signId );
		removeEl.setAttribute( 'aria-label', `Verwijder ${name} uit favorieten` );
		removeEl.textContent = 'Verwijder';

		item.append( nameEl, removeEl );

		return item;
	}

	#add() {
		const inputEl = this.inputEl;

		if ( !inputEl ) {
			return;
		}

		const signIds = parseSignIds( inputEl.value );
		let added = 0;
		let duplicate = 0;
		let unknown = 0;

		for ( const signId of signIds ) {
			if ( !getSign( signId ) ) {
				unknown++;
			} else if ( this.#favorites.has( signId ) ) {
				duplicate++;
			} else {
				this.#favorites.add( signId );
				added++;
			}
		}

		if ( 0 < added ) {
			writeFavoriteSignIds( this.#favorites );
			inputEl.value = '';
		}

		this.render();

		if ( 0 === signIds.size ) {
			this.#showStatus( 'Geen geldige links gevonden.', true );

			return;
		}

		const parts = [];

		if ( 0 < added ) {
			parts.push( `${added} toegevoegd` );
		}

		if ( 0 < duplicate ) {
			parts.push( `${duplicate} al favoriet` );
		}

		if ( 0 < unknown ) {
			parts.push( `${unknown} onbekend` );
		}

		this.#showStatus( parts.join( ' · ' ) );
	}

	#remove( signId ) {
		if ( isDefaultFavoriteSignId( signId ) ) {
			this.#showStatus( 'Standaardfavorieten kunnen niet worden verwijderd.', true );

			return;
		}

		if ( !this.#favorites.delete( signId ) ) {
			return;
		}

		writeFavoriteSignIds( this.#favorites );
		this.render();
		this.#showStatus( 'Verwijderd.' );
	}

	#showStatus( message, isError = false ) {
		const statusEl = this.statusEl;

		if ( !statusEl ) {
			return;
		}

		statusEl.textContent = message;

		if ( isError ) {
			statusEl.dataset.error = '';
		} else {
			delete statusEl.dataset.error;
		}
	}
}

customElements.define( 'favorites-manager', FavoritesManager );
