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

	#errorHandler = () => {
		if ( this.src ) {
			this.showError();
		}
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
		this.addEventListener( 'error', this.#errorHandler, true );
	}

	disconnectedCallback() {
		this.removeEventListener( 'click', this.#clickHandler );
		this.removeEventListener( 'play', this.#syncState, true );
		this.removeEventListener( 'pause', this.#syncState, true );
		this.removeEventListener( 'error', this.#errorHandler, true );
	}

	get mode() {
		return this.getAttribute( 'data-mode' ) ?? '';
	}

	set mode( value ) {
		if ( value ) {
			this.setAttribute( 'data-mode', value );

			return;
		}

		this.removeAttribute( 'data-mode' );
	}

	get aspect() {
		return Number( this.getAttribute( 'data-aspect' ) );
	}

	set aspect( value ) {
		const aspect = value || ( 4 / 3 );
		this.setAttribute( 'data-aspect', String( aspect ) );
		this.style.aspectRatio = String( aspect );
	}

	get src() {
		const videoEl = this.videoEl;

		if ( !videoEl ) {
			return '';
		}

		return videoEl.getAttribute( 'src' ) ?? '';
	}

	set src( value ) {
		const videoEl = this.videoEl;

		if ( videoEl && videoEl.getAttribute( 'src' ) !== value ) {
			videoEl.setAttribute( 'src', value ?? '' );
		}

		const errorEl = this.errorEl;

		if ( errorEl ) {
			errorEl.setAttribute( 'hidden', '' );
		}
	}

	get errorHref() {
		const errorEl = this.errorEl;

		if ( !errorEl ) {
			return '';
		}

		return errorEl.getAttribute( 'href' ) ?? '';
	}

	set errorHref( value ) {
		const errorEl = this.errorEl;

		if ( errorEl ) {
			errorEl.setAttribute( 'href', value ?? '' );
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

	showError() {
		const errorEl = this.errorEl;

		if ( errorEl ) {
			errorEl.removeAttribute( 'hidden' );
		}
	}
}

customElements.define( 'sign-video', SignVideo );
