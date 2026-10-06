import { getIndex, getVariants } from './sign-data.js';

export class SignMeta extends HTMLElement {
	#clickHandler = ( event ) => {
		const btn = event.target.closest( '[data-variant-sign-id]' );

		if ( !btn || !this.contains( btn ) ) {
			return;
		}

		this.dispatchEvent( new CustomEvent( 'variant-selected', {
			bubbles: true,
			composed: true,
			detail: {
				signId: Number( btn.getAttribute( 'data-variant-sign-id' ) ),
			},
		} ) );
	};

	get index() {
		return getIndex();
	}

	// Life cycle
	connectedCallback() {
		this.addEventListener( 'click', this.#clickHandler );
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
	}

	get conceal() {
		return this.hasAttribute( 'conceal' );
	}

	set conceal( value ) {
		if ( value ) {
			this.setAttribute( 'conceal', '' );

			return;
		}

		this.removeAttribute( 'conceal' );
	}

	#section( name ) {
		return this.querySelector( `[data-meta-section="${name}"]` );
	}

	#chipsEl( name ) {
		return this.querySelector( `[data-meta-chips="${name}"]` );
	}

	set sign( value ) {
		this.#renderHandshapes( value );
		this.#renderLocations( value );
		this.#renderRegions( value );
		this.#renderLabels( value );
		this.#renderVariants( value );
	}

	#renderHandshapes( sign ) {
		const items = [];
		const index = this.index;

		if ( sign.handshape && index ) {
			items.push( {
				label: this.#handshapeLabel( sign.handshape ),
				svg: index.handshapeIcons[sign.handshape],
			} );
		}

		this.#renderTiles( 'handshapes', items );
	}

	#renderLocations( sign ) {
		const items = [];
		const index = this.index;

		if ( sign.location && index ) {
			items.push( {
				label: index.locations[sign.location] ?? sign.location,
				svg: index.locationIcons[sign.location],
			} );
		}

		this.#renderTiles( 'locations', items );
	}

	#renderRegions( sign ) {
		let values = sign.regions;

		if ( 0 === values.length ) {
			values = [
				'Onbekend',
			];
		}

		this.#renderChips( 'regions', values );
	}

	#renderLabels( sign ) {
		const index = this.index;

		this.#renderChips( 'labels', sign.labels.map( ( id ) => {
			if ( !index ) {
				return id;
			}

			return index.labels[id] ?? id;
		} ) );
	}

	#renderVariants( sign ) {
		const container = this.querySelector( '[data-meta-variants]' );

		if ( !container ) {
			return;
		}

		const variants = getVariants( sign.glossName );

		container.replaceChildren( ...variants.map( ( variant ) => {
			const btn = document.createElement( 'button' );
			btn.type = 'button';
			btn.textContent = variant.translations.join( ', ' ) || variant.glossName;
			btn.title = `${variant.glossName} #${variant.signId}`;
			btn.setAttribute( 'data-variant-sign-id', String( variant.signId ) );
			btn.setAttribute( 'aria-current', String( variant.signId === sign.signId ) );

			return btn;
		} ) );

		this.#section( 'variants' ).hidden = variants.length <= 1;
	}

	#renderChips( name, values ) {
		const container = this.#chipsEl( name );

		if ( !container ) {
			return;
		}

		container.replaceChildren( ...values.map( ( value ) => {
			const span = document.createElement( 'span' );
			span.className = 'sign-meta__chip';
			span.textContent = value;

			return span;
		} ) );

		this.#section( name ).hidden = 0 === values.length;
	}

	#renderTiles( name, items ) {
		const container = this.querySelector( `[data-meta-tiles="${name}"]` );

		if ( !container ) {
			return;
		}

		container.replaceChildren( ...items.map( ( item ) => {
			const tile = document.createElement( 'icon-tile' );

			const art = document.createElement( 'div' );
			art.className = 'icon-tile__art';

			const label = document.createElement( 'div' );
			label.className = 'icon-tile__label';

			tile.append( art, label );

			tile.label = item.label;
			tile.svg = item.svg;

			return tile;
		} ) );

		this.#section( name ).hidden = 0 === items.length;
	}

	#handshapeLabel( value ) {
		return value.split( ';' ).map( ( part ) => {
			return part.trim();
		} ).filter( Boolean ).join( ' en ' );
	}
}

customElements.define( 'sign-meta', SignMeta );
