const LISTS_KEY = 'vgt-randomizer:lists';

export class SignLists extends HTMLElement {
	#lists = [];

	#activeListId = '';

	#currentSignId = null;

	#onChange = () => {};

	get lists() {
		return this.#lists;
	}

	get activeListId() {
		return this.#activeListId;
	}

	get activeList() {
		return this.#lists.find( ( list ) => {
			return list.id === this.#activeListId;
		} ) ?? null;
	}

	get promptEl() {
		return this.querySelector( 'sign-prompt' );
	}

	set onChange( handler ) {
		this.#onChange = handler;
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
			this.#selectChangeHandler( event );
		}
	};

	// Life cycle
	connectedCallback() {
		this.#lists = this.#load();
		this.#render();
		this.addEventListener( 'click', this.#clickHandler );
		this.addEventListener( 'change', this.#changeHandler );
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
		this.removeEventListener( 'change', this.#changeHandler );
	}

	#query( selector ) {
		return this.querySelector( selector );
	}

	#load() {
		try {
			return JSON.parse( localStorage.getItem( LISTS_KEY ) ?? '[]' ) ?? [];
		} catch {
			return [];
		}
	}

	#save() {
		localStorage.setItem( LISTS_KEY, JSON.stringify( this.#lists ) );
	}

	#render() {
		const selectEl = this.#query( '#lists-select' );
		if ( !selectEl ) {
			return;
		}

		const selected = selectEl.value;

		selectEl.replaceChildren();

		const all = document.createElement( 'option' );
		all.value = '';
		all.textContent = 'Alle tekens';
		selectEl.append( all );

		for ( const list of this.#lists ) {
			const opt = document.createElement( 'option' );
			opt.value = list.id;
			opt.textContent = `${list.name} (${list.signIds.length})`;
			selectEl.append( opt );
		}

		if ( this.#lists.some( ( list ) => {
			return list.id === selected;
		} ) ) {
			this.#activeListId = selected;
		}

		if ( !this.#lists.some( ( list ) => {
			return list.id === this.#activeListId;
		} ) ) {
			this.#activeListId = '';
		}

		selectEl.value = this.#activeListId;

		const removeEl = this.#query( '#lists-remove' );
		if ( removeEl ) {
			removeEl.disabled = !this.#activeListId;
		}

		this.#syncAddLabel();
	}

	#syncAddLabel() {
		const addEl = this.#query( '#lists-add' );
		if ( !addEl ) {
			return;
		}

		const list = this.activeList;
		const included = list && null !== this.#currentSignId && list.signIds.includes( this.#currentSignId );

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
		const list = {
			id: `l${Date.now()}`,
			name: name,
			signIds: [],
		};

		this.#lists.push( list );
		this.#save();

		return list;
	}

	async #resolveTargetList() {
		if ( this.#activeListId ) {
			return this.activeList;
		}

		if ( 0 === this.#lists.length ) {
			const name = await this.#askListName( 'Naam van de nieuwe lijst:' );

			if ( !name ) {
				return null;
			}

			return this.#createList( name );
		}

		if ( 1 === this.#lists.length ) {
			return this.#lists[0];
		}

		const promptEl = this.promptEl;
		if ( !promptEl ) {
			return null;
		}

		const names = this.#lists.map( ( list ) => {
			return list.name;
		} );
		const title = `Naam van de lijst om in te bewaren:\n${names.join( ', ' )}`;
		const choice = await promptEl.ask( {
			title,
		} );

		if ( !choice ) {
			return null;
		}

		return this.#lists.find( ( list ) => {
			return list.name === choice.trim();
		} ) ?? null;
	}

	#selectChangeHandler = () => {
		this.#activeListId = this.#query( '#lists-select' )?.value ?? '';
		this.#render();
		this.#onChange();
	};

	#createHandler = async( event ) => {
		event.preventDefault();

		const name = await this.#askListName( 'Naam van de nieuwe lijst:' );
		if ( !name ) {
			return;
		}

		const list = this.#createList( name );
		this.#activeListId = list.id;
		this.#render();
		this.#onChange();
	};

	#removeHandler = ( event ) => {
		event.preventDefault();

		const list = this.activeList;
		if ( !list ) {
			return;
		}

		this.#lists = this.#lists.filter( ( item ) => {
			return item.id !== list.id;
		} );
		this.#save();
		this.#activeListId = '';
		this.#render();
		this.#onChange();
	};

	#addHandler = async( event ) => {
		event.preventDefault();

		if ( null === this.#currentSignId ) {
			return;
		}

		const list = await this.#resolveTargetList();
		if ( !list ) {
			return;
		}

		const at = list.signIds.indexOf( this.#currentSignId );
		if ( -1 === at ) {
			list.signIds.push( this.#currentSignId );
		} else {
			list.signIds.splice( at, 1 );
		}

		this.#save();
		this.#activeListId = list.id;
		this.#render();
		this.#syncAddLabel();
		this.#onChange();
	};

	signIdsForActiveList() {
		const list = this.activeList;

		if ( list ) {
			return list.signIds;
		}

		return null;
	}

	set signId( value ) {
		this.#currentSignId = value;
		this.#syncAddLabel();
	}
}

customElements.define( 'sign-lists', SignLists );
