const EXCLUDED_KEY = 'vgt-randomizer:excluded';
const MODE_KEY = 'vgt-randomizer:mode';
const MODES = [
	'learn',
	'recognise',
	'recite',
];

export class SignRandomizer extends HTMLElement {
	#signs = [];

	#excluded = new Set();

	#byGloss = new Map();

	#current = null;

	#mode = 'learn';

	#data = {};

	// Life cycle
	async connectedCallback() {
		this.#excluded = new Set( this.#load( EXCLUDED_KEY, [] ) );

		const storedMode = this.#load( MODE_KEY, '' );
		if ( MODES.includes( storedMode ) ) {
			this.#mode = storedMode;
		} else {
			this.#mode = 'learn';
		}

		await this.#whenChildrenDefined();
		this.#wireEvents();

		try {
			const res = await fetch( 'signs.json' );
			if ( !res.ok ) {
				throw new Error( `signs.json: HTTP ${res.status}` );
			}

			const data = await res.json();

			this.#signs = data.signs ?? [];
			this.#data = {
				labels: data.labels ?? {},
				locations: data.locations ?? {},
				handshapeIcons: data.handshapeIcons ?? {},
				locationIcons: data.locationIcons ?? {},
				byGloss: new Map(),
			};

			for ( const sign of this.#signs ) {
				const group = this.#data.byGloss.get( sign.glossName ) ?? [];
				group.push( sign );
				this.#data.byGloss.set( sign.glossName, group );
			}

			const viewerEl = this.querySelector( 'sign-viewer' );
			if ( viewerEl ) {
				viewerEl.data = this.#data;
				viewerEl.onVariantSelected = ( variant ) => {
					return this.#show( variant );
				};
				viewerEl.mode = this.#mode;
			}

			this.#renderModes();
			this.#next();
		} catch ( err ) {
			this.#showError( err );
		}
	}

	#whenChildrenDefined() {
		const names = [
			'sign-viewer',
			'sign-name',
			'sign-video',
			'sign-meta',
			'sign-lists',
			'sign-prompt',
			'icon-tile',
		];

		return Promise.all( names.map( ( name ) => {
			return customElements.whenDefined( name );
		} ) );
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

	#wireEvents() {
		this.addEventListener( 'click', this.#clickHandler );

		const listsEl = this.querySelector( 'sign-lists' );
		if ( listsEl ) {
			listsEl.onChange = () => {
				return this.#next();
			};
		}
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
	}

	#load( key, fallback ) {
		try {
			return JSON.parse( localStorage.getItem( key ) ?? 'null' ) ?? fallback;
		} catch {
			return fallback;
		}
	}

	#pool() {
		const listsEl = this.querySelector( 'sign-lists' );
		const signIds = listsEl?.signIdsForActiveList();

		if ( signIds ) {
			return signIds.map( ( id ) => {
				return this.#signs.find( ( sign ) => {
					return sign.signId === id;
				} );
			} ).filter( Boolean );
		}

		return this.#signs.filter( ( sign ) => {
			return !this.#excluded.has( sign.signId );
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
		this.#show( this.#pick() );
	}

	#show( sign ) {
		this.#current = sign;

		const viewerEl = this.querySelector( 'sign-viewer' );
		if ( viewerEl ) {
			viewerEl.sign = sign;
		}

		const glossEl = this.querySelector( '[data-randomizer-gloss]' );

		const listsEl = this.querySelector( 'sign-lists' );
		if ( listsEl ) {
			if ( sign ) {
				listsEl.signId = sign.signId;
			} else {
				listsEl.signId = null;
			}
		}

		const excludeEl = this.querySelector( '#randomizer-exclude' );
		const nextEl = this.querySelector( '#randomizer-next' );

		if ( !sign ) {
			if ( glossEl ) {
				glossEl.textContent = 'Geen tekens meer';
			}
			if ( excludeEl ) {
				excludeEl.disabled = true;
			}
			if ( nextEl ) {
				nextEl.disabled = true;
			}
			this.#updateCount();

			return;
		}

		if ( excludeEl ) {
			excludeEl.disabled = false;
		}
		if ( nextEl ) {
			nextEl.disabled = false;
		}

		this.#updateCount();
	}

	#updateCount() {
		const countEl = this.querySelector( '[data-randomizer-count]' );
		if ( !countEl ) {
			return;
		}

		const listsEl = this.querySelector( 'sign-lists' );
		const list = listsEl?.activeList;

		if ( list ) {
			countEl.textContent = `lijst "${list.name}": ${this.#pool().length} van ${list.signIds.length} tekens`;

			return;
		}

		const shown = this.#pool().length;
		countEl.textContent = `${shown} van ${this.#signs.length} tekens beschikbaar · ${this.#excluded.size} uitgesloten`;
	}

	#excludeCurrent() {
		if ( !this.#current ) {
			return;
		}

		this.#excluded.add( this.#current.signId );
		localStorage.setItem( EXCLUDED_KEY, JSON.stringify( [
			...this.#excluded,
		] ) );
		this.#next();
	}

	#setMode( mode ) {
		this.#mode = mode;
		localStorage.setItem( MODE_KEY, JSON.stringify( mode ) );
		this.#renderModes();

		const viewerEl = this.querySelector( 'sign-viewer' );
		if ( viewerEl ) {
			viewerEl.mode = mode;
		}

		const wrapperEl = this.querySelector( '[data-randomizer-main]' );
		if ( wrapperEl ) {
			wrapperEl.dataset.mode = mode;
		}
	}

	#renderModes() {
		for ( const btn of this.querySelectorAll( '.sign-randomizer__modes button' ) ) {
			btn.setAttribute( 'aria-pressed', String( btn.dataset.mode === this.#mode ) );
		}
	}

	#showError( err ) {
		const errorEl = this.querySelector( '[data-randomizer-error]' );
		const glossEl = this.querySelector( '[data-randomizer-gloss]' );

		if ( errorEl ) {
			errorEl.hidden = false;
			errorEl.textContent = `Kon de index niet laden: ${err.message}. Draai eerst "npm run index" en serveer de map via "npm run serve".`;
		}

		if ( glossEl ) {
			glossEl.textContent = 'Fout';
		}
	}
}

customElements.define( 'sign-randomizer', SignRandomizer );
