import { closestRandomizer } from './dom.js';
import { readLists,
	writeLists } from './storage.js';

export class SignLists extends HTMLElement {
	static get observedAttributes() {
		return [
			'data-list-id',
		];
	}

	get listId() {
		const value = this.getAttribute( 'data-list-id' );

		if ( null === value || '' === value ) {
			return null;
		}

		return value;
	}

	set listId( value ) {
		if ( null === value || undefined === value || '' === value ) {
			this.removeAttribute( 'data-list-id' );

			return;
		}

		this.setAttribute( 'data-list-id', value );
	}

	get promptEl() {
		return this.querySelector( 'sign-prompt' );
	}

	get selectEl() {
		return this.querySelector( '#lists-select' );
	}

	get addEl() {
		return this.querySelector( '#lists-add' );
	}

	get removeEl() {
		return this.querySelector( '#lists-remove' );
	}

	activeList() {
		const listId = this.listId;

		if ( !listId ) {
			return null;
		}

		return readLists().find( ( list ) => {
			return list.id === listId;
		} ) ?? null;
	}

	signIdsForActiveList() {
		const list = this.activeList();

		if ( list ) {
			return list.signIds;
		}

		return null;
	}

	#currentSignId() {
		const randomizerEl = closestRandomizer( this );

		if ( !randomizerEl ) {
			return null;
		}

		return randomizerEl.signId;
	}

	// Life cycle
	connectedCallback() {
		this.addEventListener( 'click', this.#clickHandler );
		this.addEventListener( 'change', this.#changeHandler );
		this.render();
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
		this.removeEventListener( 'change', this.#changeHandler );
	}

	attributeChangedCallback( attrName, oldVal, newVal ) {
		if ( 'data-list-id' !== attrName || oldVal === newVal ) {
			return;
		}

		this.dispatchEvent( new CustomEvent( 'list-id-change', {
			bubbles: true,
			composed: true,
			detail: {
				listId: this.listId,
			},
		} ) );
	}

	#clickHandler = ( event ) => {
		const target = event.target;

		if ( target.closest( '#lists-new' ) ) {
			this.#createHandler( event );

			return;
		}

		if ( target.closest( '#lists-remove' ) ) {
			this.#removeHandler( event );

			return;
		}

		if ( target.closest( '#lists-add' ) ) {
			this.#addHandler( event );
		}
	};

	#changeHandler = ( event ) => {
		const selectEl = event.target.closest( '#lists-select' );

		if ( selectEl ) {
			this.#selectChangeHandler();
		}
	};

	#emitChange() {
		this.dispatchEvent( new CustomEvent( 'lists-change', {
			bubbles: true,
			composed: true,
		} ) );
	}

	render() {
		const selectEl = this.selectEl;

		if ( !selectEl ) {
			return;
		}

		const lists = readLists();
		const previousValue = selectEl.value;

		selectEl.replaceChildren();

		const all = document.createElement( 'option' );
		all.value = '';
		all.textContent = 'Alle tekens';
		selectEl.append( all );

		for ( const list of lists ) {
			const opt = document.createElement( 'option' );
			opt.value = list.id;
			opt.textContent = `${list.name} (${list.signIds.length})`;
			selectEl.append( opt );
		}

		const currentListId = this.listId;
		const stillExists = lists.some( ( list ) => {
			return list.id === currentListId;
		} );

		if ( stillExists ) {
			this.listId = currentListId;
		} else if ( lists.some( ( list ) => {
			return list.id === previousValue;
		} ) ) {
			this.listId = previousValue;
		} else {
			this.listId = null;
		}

		selectEl.value = this.listId ?? '';

		const removeEl = this.removeEl;

		if ( removeEl ) {
			removeEl.disabled = !this.listId;
		}

		this.#syncAddLabel();
	}

	#syncAddLabel() {
		const addEl = this.addEl;

		if ( !addEl ) {
			return;
		}

		const list = this.activeList();
		const signId = this.#currentSignId();
		const included = list && null !== signId && list.signIds.includes( signId );

		if ( included ) {
			addEl.textContent = 'Verwijder uit lijst';
		} else {
			addEl.textContent = 'Bewaar in lijst';
		}
	}

	async #askListName( title ) {
		const promptEl = this.promptEl;

		if ( !promptEl ) {
			return null;
		}

		const value = await promptEl.ask( {
			title,
		} );

		if ( !value || !value.trim() ) {
			return null;
		}

		return value.trim();
	}

	#createList( name ) {
		const lists = readLists();

		const list = {
			id: `l${Date.now()}`,
			name: name,
			signIds: [],
		};

		lists.push( list );
		writeLists( lists );

		return list;
	}

	async #resolveTargetList() {
		const lists = readLists();
		const activeList = this.activeList();

		if ( activeList ) {
			return activeList;
		}

		if ( 0 === lists.length ) {
			const name = await this.#askListName( 'Naam van de nieuwe lijst:' );

			if ( !name ) {
				return null;
			}

			return this.#createList( name );
		}

		if ( 1 === lists.length ) {
			return lists[0];
		}

		const promptEl = this.promptEl;

		if ( !promptEl ) {
			return null;
		}

		const names = lists.map( ( list ) => {
			return list.name;
		} );
		const title = `Naam van de lijst om in te bewaren:\n${names.join( ', ' )}`;
		const choice = await promptEl.ask( {
			title,
		} );

		if ( !choice ) {
			return null;
		}

		return lists.find( ( list ) => {
			return list.name === choice.trim();
		} ) ?? null;
	}

	#updateList( mutate ) {
		const lists = readLists();

		mutate( lists );

		writeLists( lists );
		this.render();
		this.#emitChange();
	}

	#selectChangeHandler = () => {
		let value = null;

		if ( this.selectEl ) {
			value = this.selectEl.value;
		}

		this.listId = value;
		this.render();
		this.#emitChange();
	};

	#createHandler = async( event ) => {
		event.preventDefault();

		const name = await this.#askListName( 'Naam van de nieuwe lijst:' );

		if ( !name ) {
			return;
		}

		this.#createList( name );
		this.render();
	};

	#removeHandler = ( event ) => {
		event.preventDefault();

		const list = this.activeList();

		if ( !list ) {
			return;
		}

		this.listId = null;

		this.#updateList( ( lists ) => {
			const at = lists.findIndex( ( item ) => {
				return item.id === list.id;
			} );

			if ( -1 !== at ) {
				lists.splice( at, 1 );
			}
		} );
	};

	#addHandler = async( event ) => {
		event.preventDefault();

		const signId = this.#currentSignId();

		if ( null === signId ) {
			return;
		}

		const list = await this.#resolveTargetList();

		if ( !list ) {
			return;
		}

		this.#updateList( ( lists ) => {
			const target = lists.find( ( item ) => {
				return item.id === list.id;
			} );

			if ( !target ) {
				return;
			}

			const at = target.signIds.indexOf( signId );

			if ( -1 === at ) {
				target.signIds.push( signId );
			} else {
				target.signIds.splice( at, 1 );
			}
		} );
	};
}

customElements.define( 'sign-lists', SignLists );
