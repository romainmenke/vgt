export class IconTile extends HTMLElement {
	#label = '';

	#svg = '';

	get label() {
		return this.#label;
	}

	set label( value ) {
		this.#label = value ?? '';

		const labelEl = this.querySelector( '.icon-tile__label' );
		if ( labelEl ) {
			labelEl.textContent = this.#label;
		}
	}

	set svg( value ) {
		this.#svg = value ?? '';

		const artEl = this.querySelector( '.icon-tile__art' );
		if ( !artEl ) {
			return;
		}

		if ( this.#svg ) {
			artEl.innerHTML = this.#svg;
		} else {
			artEl.textContent = this.#label;
		}
	}
}

customElements.define( 'icon-tile', IconTile );
