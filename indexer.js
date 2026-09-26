import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { buildIcons } from './icons.js';

const execFileAsync = promisify( execFile );

const BASE = 'https://woordenboek.vlaamsegebarentaal.be';
const API = `${BASE}/api/signs`;
const LABELS_API = `${BASE}/api/labels`;
const LOCATIONS_API = `${BASE}/api/locations`;
const GLOSSES_API = `${BASE}/api/glosses`;
const REGION = 'Vlaanderen';
const PAGE_SIZE = 100;
const MIN_INTERVAL_MS = 500;
const SNAPSHOT_EVERY = 50;
const OUTPUT = path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'docs', 'randomizer', 'signs.json' );

let previousRequest = 0;

async function rateLimitedRequest( url ) {
	const startedAt = Date.now();
	const wait = MIN_INTERVAL_MS - ( startedAt - previousRequest );

	if ( 0 < wait ) {
		await new Promise( ( resolve ) => {
			setTimeout( resolve, wait );
		} );
	}

	// eslint-disable-next-line require-atomic-updates
	previousRequest = Date.now();

	const res = await fetch( url, {
		headers: {
			'user-agent': 'vgt-randomizer-indexer/1.0',
		},
	} );

	if ( !res.ok ) {
		throw new Error( `HTTP ${res.status} for ${url}` );
	}

	return res;
}

async function rateLimitedFetch( url ) {
	const res = await rateLimitedRequest( url );

	return res.json();
}

async function rateLimitedText( url ) {
	const res = await rateLimitedRequest( url );

	return res.text();
}

function buildUrl( from, size ) {
	const params = new URLSearchParams( {
		c: '[]',
		from: String( from ),
		g: '[]',
		h: '[]',
		l: '[]',
		lb: '[]',
		mode: 'ANDExact',
		q: '[]',
		r: JSON.stringify( [
			REGION,
		] ),
		size: String( size ),
		e: '[]',
	} );

	return `${API}?${params}`;
}

function slim( sign ) {
	return {
		signId: sign.signId,
		glossName: sign.glossName,
		translations: sign.translations ?? [],
		labels: sign.labels ?? [],
		regions: sign.regions ?? [],
		video: sign.video ?? null,
	};
}

async function probeAspect( url ) {
	try {
		const {
			stdout,
		} = await execFileAsync( 'ffprobe', [
			'-v',
			'error',
			'-select_streams',
			'v:0',
			'-show_entries',
			'stream=width,height',
			'-of',
			'json',
			url,
		], {
			timeout: 30000,
		} );

		const stream = JSON.parse( stdout ).streams?.[0];
		if ( stream?.width && stream?.height ) {
			return Number( ( stream.width / stream.height ).toFixed( 3 ) );
		}
	} catch {
		// fall through to default
	}

	return null;
}

async function addAspects( byId ) {
	const pending = [
		...byId.values(),
	].filter( ( sign ) => {
		return sign.video && !( 'aspect' in sign );
	} );

	if ( 0 === pending.length ) {
		return;
	}

	console.log( `Probing ${pending.length} video aspect ratios…` );
	let done = 0;

	for ( const sign of pending ) {
		sign.aspect = await probeAspect( sign.video );
		done++;

		if ( 0 === done % 25 ) {
			process.stdout.write( `\rprobed ${done}/${pending.length} videos` );
		}
	}

	process.stdout.write( `\rprobed ${done}/${pending.length} videos\n` );
}

async function loadExistingFile() {
	try {
		return JSON.parse( await readFile( OUTPUT, 'utf8' ) );
	} catch {
		return null;
	}
}

function assemble( byId, labels, locations, icons = {} ) {
	const signs = [
		...byId.values(),
	].sort( ( a, b ) => {
		return a.signId - b.signId;
	} );

	return {
		generatedAt: new Date().toISOString(),
		region: REGION,
		source: 'https://woordenboek.vlaamsegebarentaal.be/search?r=Vlaanderen',
		count: signs.length,
		labels: labels,
		locations: locations,
		handshapeIcons: icons.handshapeIcons ?? {},
		locationIcons: icons.locationIcons ?? {},
		signs: signs,
	};
}

async function fetchMap( url, fallback, pick ) {
	try {
		const data = await rateLimitedFetch( url );

		if ( !Array.isArray( data ) ) {
			return fallback;
		}

		return {
			...fallback,
			...Object.fromEntries( data.map( pick ) ),
		};
	} catch ( err ) {
		console.warn( `Could not fetch ${url}: ${err.message}` );

		return fallback;
	}
}

async function indexSigns( byId ) {
	let from = 0;
	let total = Infinity;

	while ( from < total ) {
		const data = await rateLimitedFetch( buildUrl( from, PAGE_SIZE ) );
		total = data.totalNumberSignOverviews;
		const page = data.signOverviews ?? [];

		for ( const sign of page ) {
			if ( false === sign.regions?.includes( REGION ) ) {
				continue;
			}

			const next = slim( sign );
			const previous = byId.get( sign.signId );

			if ( previous ) {
				if ( 'handshape' in previous ) {
					next.handshape = previous.handshape;
					next.location = previous.location;
				}

				if ( 'aspect' in previous ) {
					next.aspect = previous.aspect;
				}
			}

			byId.set( sign.signId, next );
		}

		from += PAGE_SIZE;
		process.stdout.write( `\rindexed ${byId.size} signs (page offset ${from}/${total})` );

		if ( 0 === page.length ) {
			break;
		}
	}

	process.stdout.write( '\n' );
}

async function enrich( byId, labels, locations, icons ) {
	const pending = new Map();

	for ( const sign of byId.values() ) {
		if ( !( 'handshape' in sign ) && !pending.has( sign.glossName ) ) {
			pending.set( sign.glossName, true );
		}
	}

	const glosses = [
		...pending.keys(),
	];
	if ( 0 === glosses.length ) {
		console.log( 'All signs already enriched.' );

		return;
	}

	console.log( `Enriching ${glosses.length} glosses with handshape/location…` );
	let done = 0;

	for ( const glossName of glosses ) {
		const glossSignIds = [
			...byId.values(),
		]
			.filter( ( sign ) => {
				return sign.glossName === glossName;
			} )
			.map( ( sign ) => {
				return sign.signId;
			} );

		try {
			const detail = await rateLimitedFetch( `${GLOSSES_API}/${encodeURIComponent( glossName )}` );

			for ( const variant of detail.variants ?? [] ) {
				const sign = byId.get( variant.signId );

				if ( sign ) {
					sign.handshape = variant.startHandshape ?? null;
					sign.location = variant.startLocation ?? null;
				}
			}
		} catch ( err ) {
			console.warn( `\nCould not enrich "${glossName}": ${err.message}` );
		}

		for ( const signId of glossSignIds ) {
			const sign = byId.get( signId );

			if ( sign && !( 'handshape' in sign ) ) {
				sign.handshape = null;
				sign.location = null;
			}
		}

		done++;
		process.stdout.write( `\renriched ${done}/${glosses.length} glosses` );

		if ( 0 === done % SNAPSHOT_EVERY ) {
			await writeFile( OUTPUT, JSON.stringify( assemble( byId, labels, locations, icons ), null, 2 ) + '\n' );
		}
	}

	process.stdout.write( '\n' );
}

async function main() {
	const existingFile = await loadExistingFile();
	const byId = new Map( ( existingFile?.signs ?? [] ).map( ( sign ) => {
		return [
			sign.signId,
			sign,
		];
	} ) );
	const before = byId.size;

	await indexSigns( byId );

	const labels = await fetchMap( LABELS_API, existingFile?.labels ?? {}, ( label ) => {
		return [
			label.id,
			label.name,
		];
	} );
	const locations = await fetchMap( LOCATIONS_API, existingFile?.locations ?? {}, ( location ) => {
		return [
			location.id,
			location.name,
		];
	} );

	console.log( 'Building handshape/location icons…' );
	const icons = await buildIcons( rateLimitedText, existingFile ?? {} );

	await enrich( byId, labels, locations, icons );
	await addAspects( byId );

	const result = assemble( byId, labels, locations, icons );
	await writeFile( OUTPUT, JSON.stringify( result, null, 2 ) + '\n' );

	const enriched = result.signs.filter( ( sign ) => {
		return 'handshape' in sign;
	} ).length;
	console.log( `Done. ${result.count} signs (${result.count - before} new, ${enriched} enriched) in ${OUTPUT}.` );
}

main().catch( ( err ) => {
	console.error( err );
	process.exit( 1 );
} );
