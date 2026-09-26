export class SignPrompt extends HTMLElement {
	#resolve = null;

	#clickHandler = ( event ) => {
		if ( event.target.closest( '#prompt-ok' ) ) {
			this.#settle( this.querySelector( '.sign-prompt__input' )?.value ?? '' );

			return;
		}

		if ( event.target.closest( '#prompt-cancel' ) ) {
			this.#settle( null );
		}
	};

	// Life cycle
	connectedCallback() {
		this.hidden = true;
		this.addEventListener( 'click', this.#clickHandler );
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
	}

	#settle( value ) {
		const resolve = this.#resolve;
		this.#resolve = null;
		this.hidden = true;

		if ( resolve ) {
			resolve( value );
		}
	}

	ask( {
		title, label = '', value = '',
	} = {} ) {
		const titleEl = this.querySelector( '#prompt-title' );
		const labelEl = this.querySelector( '#prompt-label' );
		const inputEl = this.querySelector( '.sign-prompt__input' );

		if ( titleEl ) {
			titleEl.textContent = title ?? '';
		}

		if ( labelEl ) {
			labelEl.textContent = label;
			labelEl.hidden = '' === label;
		}

		if ( inputEl ) {
			inputEl.value = value;
		}

		this.hidden = false;
		inputEl?.focus();

		return new Promise( ( resolve ) => {
			this.#resolve = resolve;
		} );
	}
}

customElements.define( 'sign-prompt', SignPrompt );
