export class SignViewer extends HTMLElement {
	#meta = {};

	#data = {};

	#onVariantSelected = () => {};

	set data( value ) {
		this.#data = value;
		this.#meta = {
			labels: value.labels,
			locations: value.locations,
			handshapeIcons: value.handshapeIcons,
			locationIcons: value.locationIcons,
			byGloss: value.byGloss,
		};

		const metaEl = this.querySelector( 'sign-meta' );
		if ( metaEl ) {
			metaEl.data = this.#meta;
		}
	}

	set onVariantSelected( handler ) {
		this.#onVariantSelected = handler;

		const metaEl = this.querySelector( 'sign-meta' );
		if ( metaEl ) {
			metaEl.onVariantSelected = handler;
		}
	}

	set mode( value ) {
		const videoEl = this.querySelector( 'sign-video' );
		if ( videoEl ) {
			videoEl.mode = value;
		}

		const nameEl = this.querySelector( 'sign-name' );
		if ( nameEl ) {
			if ( 'recognise' === value ) {
				nameEl.setAttribute( 'reveal', '' );
			} else {
				nameEl.removeAttribute( 'reveal' );
			}
		}

		if ( 'recite' === value ) {
			videoEl?.pause();
		} else {
			videoEl?.play();
		}
	}

	set sign( value ) {
		if ( !value ) {
			this.hidden = true;

			return;
		}

		this.hidden = false;

		const nameEl = this.querySelector( 'sign-name' );
		if ( nameEl ) {
			nameEl.sign = value;
		}

		const videoEl = this.querySelector( 'sign-video' );
		if ( videoEl ) {
			videoEl.aspect = value.aspect;
			videoEl.src = value.video;
		}

		const metaEl = this.querySelector( 'sign-meta' );
		if ( metaEl ) {
			metaEl.sign = value;
		}

		const sourceEl = this.querySelector( '[data-sign-source]' );
		if ( sourceEl ) {
			sourceEl.href = this.#detailUrl( value );
		}

		const videoErrorEl = this.querySelector( '.sign-video__error' );
		if ( videoErrorEl && videoEl ) {
			videoEl.errorEl.setAttribute( 'href', this.#detailUrl( value ) );
		}
	}

	#detailUrl( sign ) {
		return `https://woordenboek.vlaamsegebarentaal.be/gloss/${encodeURIComponent( sign.glossName )}?sid=${sign.signId}`;
	}
}

customElements.define( 'sign-viewer', SignViewer );
