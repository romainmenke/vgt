const BASE = 'https://woordenboek.vlaamsegebarentaal.be';

function escapeXml( value ) {
	return String( value )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' );
}

function serialize( node ) {
	if ( 'string' === typeof node ) {
		return escapeXml( node );
	}

	const attrs = Object.entries( node.attrs ?? {} )
		.map( ( [
			key,
			value,
		] ) => {
			return ` ${key}="${escapeXml( value )}"`;
		} )
		.join( '' );
	const children = ( node.children ?? [] ).map( serialize ).join( '' );

	return `<${node.tag}${attrs}>${children}</${node.tag}>`;
}

function chunkToSvg( code, chunkId ) {
	const modules = {};
	const self = {
		webpackChunkvgtapp: {
			push: ( [
				, mods,
			] ) => {
				Object.assign( modules, mods );
			},
		},
	};

	// eslint-disable-next-line no-new-func
	new Function( 'self', code )( self );

	const factory = modules[chunkId];
	if ( !factory ) {
		throw new Error( `module ${chunkId} not found in chunk` );
	}

	const module = {
		exports: {},
	};
	factory( module );
	const render = module.exports.render;
	if ( 'function' !== typeof render ) {
		throw new Error( `module ${chunkId} has no render` );
	}

	const h = ( tag, data, children ) => {
		return {
			tag: tag,
			attrs: data?.attrs ?? {},
			children: children ?? [],
		};
	};
	const vm = {
		$createElement: h,
		_self: {
			_c: h,
		},
	};

	return serialize( render.call( vm ) );
}

function parseHashMap( app ) {
	const marker = 'n.u=function(e){return"js/"+e+"."+';
	const start = app.indexOf( marker );
	if ( -1 === start ) {
		throw new Error( 'webpack chunk filename runtime not found' );
	}

	let depth = 0;
	let end = start;

	for ( let i = start + marker.length; i < app.length; i++ ) {
		if ( '{' === app[i] ) {
			depth++;
		} else if ( '}' === app[i] ) {
			depth--;

			if ( 0 === depth ) {
				end = i + 1;
				break;
			}
		}
	}

	const text = app.slice( start + marker.length, end );
	const map = {};

	for ( const match of text.matchAll( /(\d+):"([0-9a-f]+)"/g ) ) {
		map[match[1]] = match[2];
	}

	return map;
}

function parseRequireMap( app ) {
	const map = {};

	for ( const match of app.matchAll( /"\.\/((?:handshapes|location\/tiles)\/[^"]*\.svg)":\[(\d+),(\d+)\]/g ) ) {
		map[match[1]] = {
			moduleId: match[2],
			chunkId: match[3],
		};
	}

	return map;
}

function parseHandshapes( app ) {
	const shapes = {};

	for ( const match of app.matchAll( /e\["(Shape_[A-Za-z0-9_]+)"\]=('([^']*)'|"([^"]*)")/g ) ) {
		shapes[match[1]] = match[3] ?? match[4];
	}

	const icons = {};

	for ( const match of app.matchAll( /\{displayIcon:\{customSvg:"([^"]+)"\},handshape:a\.(Shape_[A-Za-z0-9_]+)\}/g ) ) {
		icons[match[2]] = match[1];
	}

	const byValue = {};

	for ( const [
		shape,
		value,
	] of Object.entries( shapes ) ) {
		if ( icons[shape] ) {
			byValue[value] = icons[shape];
		}
	}

	return byValue;
}

export async function buildIcons( fetchText, existing = {} ) {
	try {
		const html = await fetchText( `${BASE}/` );
		const appMatch = html.match( /js\/app\.[a-z0-9]+\.js/ );

		if ( !appMatch ) {
			throw new Error( 'app bundle not found in HTML' );
		}

		const app = await fetchText( `${BASE}/${appMatch[0]}` );
		const hashes = parseHashMap( app );
		const requires = parseRequireMap( app );
		const handshapes = parseHandshapes( app );

		const download = async( assetName ) => {
			const entry = requires[`${assetName}.svg`];
			const hash = entry && hashes[entry.chunkId];

			if ( !entry || !hash ) {
				throw new Error( `no chunk for ${assetName}` );
			}

			const code = await fetchText( `${BASE}/js/${entry.chunkId}.${hash}.js` );

			return chunkToSvg( code, entry.moduleId );
		};

		const handshapeIcons = {
			...existing.handshapeIcons,
		};

		for ( const [
			value,
			assetName,
		] of Object.entries( handshapes ) ) {
			handshapeIcons[value] = await download( assetName );
		}

		const locationIcons = {
			...existing.locationIcons,
		};

		for ( const assetName of Object.keys( requires ) ) {
			if ( !assetName.startsWith( 'location/tiles/' ) ) {
				continue;
			}

			const base = assetName.replace( /\.svg$/, '' );
			const id = base.replace( 'location/tiles/', '' ).replace( '_tile', '' );
			locationIcons[id] = await download( base );
		}

		return {
			handshapeIcons,
			locationIcons,
		};
	} catch ( err ) {
		console.warn( `Could not build icons: ${err.message}` );

		return {
			handshapeIcons: existing.handshapeIcons ?? {},
			locationIcons: existing.locationIcons ?? {},
		};
	}
}
