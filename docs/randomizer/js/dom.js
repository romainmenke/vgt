export function closestRandomizer( fromEl ) {
	if ( !fromEl ) {
		return null;
	}

	return fromEl.closest( 'sign-randomizer' );
}

export function readBooleanAttribute( el, name ) {
	if ( !el ) {
		return false;
	}

	return el.hasAttribute( name );
}

export function readNumberAttribute( el, name ) {
	if ( !el ) {
		return null;
	}

	const value = el.getAttribute( name );

	if ( null === value || '' === value ) {
		return null;
	}

	return Number( value );
}

export function writeNumberAttribute( el, name, value ) {
	if ( !el ) {
		return;
	}

	if ( null === value || undefined === value ) {
		el.removeAttribute( name );

		return;
	}

	el.setAttribute( name, String( value ) );
}

export function readStringAttribute( el, name, allowed ) {
	if ( !el ) {
		return '';
	}

	const value = el.getAttribute( name ) ?? '';

	if ( Array.isArray( allowed ) && !allowed.includes( value ) ) {
		return '';
	}

	return value;
}
