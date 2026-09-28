export const EXCLUDED_KEY = 'vgt-randomizer:excluded';
export const FAVORITES_KEY = 'vgt-randomizer:favorites';
export const MODE_KEY = 'vgt-randomizer:mode';

export const MODES = [
	'learn',
	'recognise',
	'recite',
];

export const DEFAULT_FAVORITE_SIGN_IDS = new Set( [
	10287,
	10936,
	10943,
	11034,
	1110,
	11358,
	11376,
	11508,
	11595,
	1166,
	11710,
	11979,
	12014,
	12161,
	12206,
	12629,
	12630,
	12724,
	12734,
	12892,
	13317,
	13419,
	13420,
	13566,
	13614,
	13657,
	13697,
	13700,
	13717,
	13821,
	13825,
	13857,
	13892,
	13919,
	14141,
	14142,
	1427,
	14283,
	14286,
	14331,
	14350,
	14367,
	14368,
	14420,
	14504,
	14734,
	15020,
	15033,
	15049,
	15094,
	15277,
	15278,
	15279,
	15281,
	15282,
	15283,
	15284,
	15285,
	15286,
	15287,
	15289,
	15291,
	15293,
	15294,
	15296,
	15297,
	15301,
	15304,
	15305,
	15307,
	15310,
	15313,
	15314,
	15315,
	15316,
	15318,
	15319,
	15321,
	15323,
	15324,
	15325,
	15326,
	15327,
	15328,
	15329,
	15330,
	15331,
	15332,
	15333,
	15334,
	15335,
	15336,
	15337,
	15338,
	15407,
	16458,
	16724,
	16965,
	1713,
	17601,
	1802,
	19777,
	1984,
	2021,
	21084,
	2129,
	24098,
	24121,
	24135,
	2461,
	2463,
	2623,
	2824,
	2862,
	2864,
	3092,
	3136,
	3270,
	3271,
	373,
	3812,
	3813,
	4092,
	4114,
	4177,
	4452,
	4657,
	4905,
	4956,
	4970,
	5115,
	5116,
	5178,
	519,
	5265,
	5464,
	5505,
	5521,
	5569,
	5719,
	5737,
	5974,
	6089,
	6173,
	6396,
	64,
	6588,
	6635,
	6759,
	6765,
	7053,
	7376,
	7377,
	760,
	7617,
	7676,
	7678,
	7954,
	8043,
	8054,
	8057,
	8058,
	8175,
	8204,
	8222,
	8375,
	8420,
	8491,
	8728,
	895,
	8981,
	9001,
	9066,
	9149,
	9260,
	9286,
	935,
	9513,
	9621,
	9624,
	9844,
	9845,
	9848,
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
