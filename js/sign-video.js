export class SignVideo extends HTMLElement {
	#clickHandler = ( event ) => {
		const playHintEl = event.target.closest( '.sign-video__play-hint' );

		if ( playHintEl && this.contains( playHintEl ) ) {
			event.preventDefault();
			this.play();
		}
	};

	#syncState = () => {
		const videoEl = this.videoEl;
		if ( !videoEl ) {
			return;
		}

		this.classList.toggle( 'is-paused', videoEl.paused );
	};

	get videoEl() {
		return this.querySelector( '.sign-video__media' );
	}

	get playHintEl() {
		return this.querySelector( '.sign-video__play-hint' );
	}

	get errorEl() {
		return this.querySelector( '.sign-video__error' );
	}

	// Life cycle
	connectedCallback() {
		this.addEventListener( 'click', this.#clickHandler );
		this.addEventListener( 'play', this.#syncState, true );
		this.addEventListener( 'pause', this.#syncState, true );
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
		this.removeEventListener( 'play', this.#syncState, true );
		this.removeEventListener( 'pause', this.#syncState, true );
	}

	set mode( value ) {
		this.setAttribute( 'data-mode', value );
	}

	set aspect( value ) {
		this.style.aspectRatio = String( value || ( 4 / 3 ) );
	}

	set src( value ) {
		const videoEl = this.videoEl;
		if ( !videoEl ) {
			return;
		}

		if ( videoEl.getAttribute( 'src' ) !== value ) {
			videoEl.setAttribute( 'src', value || '' );
		}

		const errorEl = this.errorEl;
		if ( errorEl ) {
			errorEl.setAttribute( 'hidden', '' );
		}
	}

	play() {
		const videoEl = this.videoEl;
		if ( !videoEl ) {
			return;
		}

		videoEl.play().catch( () => {} );
	}

	pause() {
		const videoEl = this.videoEl;
		if ( !videoEl ) {
			return;
		}

		videoEl.pause();
		videoEl.currentTime = 0;
	}

	showError( href ) {
		const errorEl = this.errorEl;
		if ( !errorEl ) {
			return;
		}

		errorEl.setAttribute( 'href', href );
		errorEl.removeAttribute( 'hidden' );
	}
}

customElements.define( 'sign-video', SignVideo );
