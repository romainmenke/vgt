export const EXCLUDED_KEY = 'vgt-randomizer:excluded';
export const FAVORITES_KEY = 'vgt-randomizer:favorites';
export const MODE_KEY = 'vgt-randomizer:mode';

export const MODES = [
	'learn',
	'recognise',
	'recite',
];

export const DEFAULT_FAVORITE_SIGN_IDS = new Set( [
	64, 519, 760, 895, 935, 1110, 1166, 1427, 1713, 1802, 1984, 2129,
	2461, 2463, 2623, 2862, 2864, 3092, 3136, 3270, 3271, 3812, 3813,
	4092, 4657, 4905, 4970, 5115, 5116, 5178, 5719, 5737, 5974, 6089,
	6173, 6635, 6759, 7376, 7377, 7617, 7676, 7678, 8054, 8057, 8058,
	8204, 8222, 8375, 8420, 8491, 8728, 8981, 9001, 9066, 9149, 9260,
	9286, 9513, 9621, 9624, 9844, 9845, 9848, 10287, 10936, 10943,
	11034, 11358, 11376, 11508, 11595, 11710, 11979, 12014, 12161,
	12206, 12629, 12630, 12724, 12734, 12892, 13317, 13419, 13420,
	13566, 13614, 13657, 13697, 13700, 13717, 13821, 13825, 13857,
	13892, 13919, 14141, 14142, 14331, 14350, 14367, 14368, 14420,
	14734, 15033, 15094, 15407, 16965, 19777, 21084, 24098, 24121,
	24135,
] );

export function isDefaultFavoriteSignId( signId ) {
	return DEFAULT_FAVORITE_SIGN_IDS.has( Number( signId ) );
}

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
	const favorites = new Set( DEFAULT_FAVORITE_SIGN_IDS );

	if ( Array.isArray( ids ) ) {
		for ( const id of ids ) {
			favorites.add( Number( id ) );
		}
	}

	return favorites;
}

export function writeFavoriteSignIds( ids ) {
	writeJson( FAVORITES_KEY, [
		...ids,
	].filter( ( id ) => {
		return !isDefaultFavoriteSignId( id );
	} ) );
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
