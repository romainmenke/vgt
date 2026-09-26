export class SignName extends HTMLElement {
	static get observedAttributes() {
		return [
			'conceal',
		];
	}

	#clickHandler = ( event ) => {
		event.preventDefault();
		this.setAttribute( 'revealed', '' );
	};

	get glossEl() {
		return this.querySelector( '.sign-name__gloss' );
	}

	get translationEl() {
		return this.querySelector( '.sign-name__translation' );
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

	// Life cycle
	connectedCallback() {
		this.addEventListener( 'click', this.#clickHandler );
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
	}

	attributeChangedCallback( attrName, oldVal, newVal ) {
		if ( 'conceal' === attrName && null === newVal ) {
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

		if ( this.conceal ) {
			this.removeAttribute( 'revealed' );
		} else {
			this.setAttribute( 'revealed', '' );
		}
	}
}

customElements.define( 'sign-name', SignName );
