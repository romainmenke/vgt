export const EXCLUDED_KEY = 'vgt-randomizer:excluded';
export const FAVORITES_KEY = 'vgt-randomizer:favorites';
export const MODE_KEY = 'vgt-randomizer:mode';

export const MODES = [
	'learn',
	'recognise',
	'recite',
];

export function readJson( key, fallback ) {
	try {
		const value = JSON.parse( localStorage.getItem( key ) ?? 'null' );

		if ( null === value || undefined === value ) {
			return fallback;
		}

		return value;
	} catch {
		return fallback;
	}
}

export function writeJson( key, value ) {
	localStorage.setItem( key, JSON.stringify( value ) );
}

export function readExcludedSignIds() {
	const ids = readJson( EXCLUDED_KEY, [] );

	if ( !Array.isArray( ids ) ) {
		return new Set();
	}

	return new Set( ids );
}

export function writeExcludedSignIds( ids ) {
	writeJson( EXCLUDED_KEY, [
		...ids,
	] );
}

export function readFavoriteSignIds() {
	const ids = readJson( FAVORITES_KEY, [] );

	if ( !Array.isArray( ids ) ) {
		return new Set();
	}

	return new Set( ids );
}

export function writeFavoriteSignIds( ids ) {
	writeJson( FAVORITES_KEY, [
		...ids,
	] );
}

export function readMode() {
	const mode = readJson( MODE_KEY, null );

	if ( !MODES.includes( mode ) ) {
		return 'learn';
	}

	return mode;
}

export function writeMode( mode ) {
	writeJson( MODE_KEY, mode );
}
