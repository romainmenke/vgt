import { closestRandomizer } from './dom.js';
import { getSign } from './sign-data.js';

const DETAIL_BASE = 'https://woordenboek.vlaamsegebarentaal.be/gloss';

export class SignViewer extends HTMLElement {
	get nameEl() {
		return this.querySelector( 'sign-name' );
	}

	get videoEl() {
		return this.querySelector( 'sign-video' );
	}

	get metaEl() {
		return this.querySelector( 'sign-meta' );
	}

	get sourceEl() {
		return this.querySelector( '[data-sign-source]' );
	}

	render() {
		const randomizerEl = closestRandomizer( this );
		let signId = null;
		let mode = 'learn';

		if ( randomizerEl ) {
			signId = randomizerEl.signId;
			mode = randomizerEl.mode;
		}

		const sign = getSign( signId );

		const nameEl = this.nameEl;

		if ( nameEl ) {
			nameEl.reveal = 'recognise' === mode;
		}

		if ( !sign ) {
			this.hidden = true;
			this.videoEl?.pause();

			return;
		}

		this.hidden = false;

		if ( nameEl ) {
			nameEl.sign = sign;
		}

		const videoEl = this.videoEl;

		if ( videoEl ) {
			videoEl.aspect = sign.aspect;
			videoEl.src = sign.video;
			videoEl.mode = mode;

			if ( 'recite' === mode ) {
				videoEl.pause();
			} else {
				videoEl.play();
			}
		}

		const metaEl = this.metaEl;

		if ( metaEl ) {
			metaEl.sign = sign;
		}

		const sourceEl = this.sourceEl;
		const detailUrl = this.#detailUrl( sign );

		if ( sourceEl ) {
			sourceEl.href = detailUrl;
		}

		if ( videoEl ) {
			videoEl.errorHref = detailUrl;
		}
	}

	#detailUrl( sign ) {
		return `${DETAIL_BASE}/${encodeURIComponent( sign.glossName )}?sid=${sign.signId}`;
	}
}

customElements.define( 'sign-viewer', SignViewer );
