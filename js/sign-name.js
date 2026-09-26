export class SignName extends HTMLElement {
	static get observedAttributes() {
		return [
			'reveal',
		];
	}

	#clickHandler = ( event ) => {
		if ( !this.hasAttribute( 'reveal' ) ) {
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
		if ( this.glossEl ) {
			this.glossEl.textContent = value.glossName;
		}

		if ( this.translationEl ) {
			this.translationEl.textContent = value.translations.join( ', ' );
		}

		this.setAttribute( 'revealed', '' );
	}
}

customElements.define( 'sign-name', SignName );
