export class SignName extends HTMLElement {
	static get observedAttributes() {
		return [
			'reveal',
		];
	}

	#clickHandler = ( event ) => {
		if ( !this.reveal ) {
			return;
		}

		event.preventDefault();
		this.setAttribute( 'revealed', '' );
	};

	get glossEl() {
		return this.querySelector( '.sign-name__gloss' );
	}

	get translationEl() {
		return this.querySelector( '.sign-name__translation' );
	}

	get reveal() {
		return this.hasAttribute( 'reveal' );
	}

	set reveal( value ) {
		if ( value ) {
			this.setAttribute( 'reveal', '' );

			return;
		}

		this.removeAttribute( 'reveal' );
	}

	// Life cycle
	connectedCallback() {
		this.addEventListener( 'click', this.#clickHandler );
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
	}

	attributeChangedCallback( attrName, oldVal, newVal ) {
		if ( 'reveal' === attrName && null === newVal ) {
			this.removeAttribute( 'revealed' );
		}
	}

	set sign( value ) {
		const glossEl = this.glossEl;

		if ( glossEl ) {
			glossEl.textContent = value.glossName;
		}

		const translationEl = this.translationEl;

		if ( translationEl ) {
			translationEl.textContent = value.translations.join( ', ' );
		}

		this.setAttribute( 'revealed', '' );
	}
}

customElements.define( 'sign-name', SignName );
