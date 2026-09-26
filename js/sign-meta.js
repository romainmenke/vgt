export class SignMeta extends HTMLElement {
	#labels = {};

	#locations = {};

	#handshapeIcons = {};

	#locationIcons = {};

	#byGloss = new Map();

	#onVariantSelected = () => {};

	set data( value ) {
		this.#labels = value.labels ?? {};
		this.#locations = value.locations ?? {};
		this.#handshapeIcons = value.handshapeIcons ?? {};
		this.#locationIcons = value.locationIcons ?? {};
		this.#byGloss = value.byGloss ?? new Map();
	}

	set onVariantSelected( handler ) {
		this.#onVariantSelected = handler;
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

		if ( sign.handshape ) {
			items.push( {
				label: this.#handshapeLabel( sign.handshape ),
				svg: this.#handshapeIcons[sign.handshape],
			} );
		}

		this.#renderTiles( 'handshapes', items );
	}

	#renderLocations( sign ) {
		const items = [];

		if ( sign.location ) {
			items.push( {
				label: this.#locations[sign.location] ?? sign.location,
				svg: this.#locationIcons[sign.location],
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
		this.#renderChips( 'labels', sign.labels.map( ( id ) => {
			return this.#labels[id] ?? id;
		} ) );
	}

	#renderVariants( sign ) {
		const container = this.querySelector( '[data-meta-variants]' );
		if ( !container ) {
			return;
		}

		const variants = this.#byGloss.get( sign.glossName ) ?? [];

		container.replaceChildren( ...variants.map( ( variant ) => {
			const btn = document.createElement( 'button' );
			btn.type = 'button';
			btn.textContent = variant.translations.join( ', ' ) || variant.glossName;
			btn.title = `${variant.glossName} #${variant.signId}`;
			btn.setAttribute( 'aria-current', String( variant.signId === sign.signId ) );
			btn.addEventListener( 'click', () => {
				return this.#onVariantSelected( variant );
			} );

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

		this.#section( name ).hidden = values.length === 0;
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

		this.#section( name ).hidden = items.length === 0;
	}

	#handshapeLabel( value ) {
		return value.split( ';' ).map( ( part ) => {
			return part.trim();
		} ).filter( Boolean ).join( ' en ' );
	}
}

customElements.define( 'sign-meta', SignMeta );
