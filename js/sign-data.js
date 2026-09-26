let index = null;
let loadPromise = null;

async function load() {
	const res = await fetch( 'signs.json' );

	if ( !res.ok ) {
		throw new Error( `signs.json: HTTP ${res.status}` );
	}

	const data = await res.json();

	const byGloss = new Map();
	const signs = data.signs ?? [];

	for ( const sign of signs ) {
		const group = byGloss.get( sign.glossName ) ?? [];
		group.push( sign );
		byGloss.set( sign.glossName, group );
	}

	return {
		signs: signs,
		labels: data.labels ?? {},
		locations: data.locations ?? {},
		handshapeIcons: data.handshapeIcons ?? {},
		locationIcons: data.locationIcons ?? {},
		byGloss: byGloss,
	};
}

export function whenReady() {
	if ( !loadPromise ) {
		loadPromise = load().then( ( loaded ) => {
			index = loaded;

			return loaded;
		} );
	}

	return loadPromise;
}

export function getIndex() {
	return index;
}

export function getSigns() {
	if ( !index ) {
		return [];
	}

	return index.signs;
}

export function getSign( signId ) {
	if ( !index || null === signId || undefined === signId || '' === signId ) {
		return null;
	}

	return index.signs.find( ( sign ) => {
		return sign.signId === Number( signId );
	} ) ?? null;
}

export function getVariants( glossName ) {
	if ( !index ) {
		return [];
	}

	return index.byGloss.get( glossName ) ?? [];
}
