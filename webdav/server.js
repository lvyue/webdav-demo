const webdav = require('webdav-server').v2;
const xmlBuilder = require('xml-js-builder');
const debug = require('debug')('webdav');
const HTTPCodes = webdav.HTTPCodes;
const oss = require('./oss');
const server = new webdav.WebDAVServer({

});

server.method('MKCOL', {
	unchunked(ctx, data, next) {
		debug('================================================MKCOL================================================');
		debug(data.toString('utf-8'));
		const path = ctx.requested.path.toString(true);
		const method = ctx.headers.find('trace-method', '*').toLowerCase();
		const separator = ctx.headers.find('trace-separator', '\r\n');
		debug('path:', path, '\nmethod:', method, '\nseparator:', separator);
		oss.createFolder('demo', path).then(folder => {
			debug(folder);
			ctx.setCode(HTTPCodes.Created);
			// 写出response;
			next();
		}).catch(err => {
			debug(err);
			ctx.setCode(HTTPCodes.InternalServerError);
			next();
		});
	}
});

debug(require('./commands/Propfind')());
server.method('PROPFIND', require('./commands/Propfind')());

function unchunked(ctx, data, next) {
	debug('================================================PROPFIND================================================');
	debug(data.toString('utf-8'));
	const path = ctx.requested.path.toString(true);
	const nbPaths = ctx.requested.path.paths.length;
	const method = ctx.headers.find('trace-method', '*').toLowerCase();
	const separator = ctx.headers.find('trace-separator', '\r\n');
	const iDepth = parseInt(ctx.headers.find('trace-depth', 'infinity').toLowerCase());
	const depth = isNaN(iDepth) ? -1 : iDepth;
	debug(ctx.headers);
	debug('path:', path, '\nnbPaths', nbPaths, '\nmethod:', method, '\nseparator:', separator, '\ndepth:', depth);
	oss.list('demo', {
		prefix: path
	}).then(res => {
		ctx.setCode(webdav.HTTPCodes.MultiStatus);
		var multistatus = new xmlBuilder.XMLElementBuilder('A:multistatus', {
			'xmlns:A': 'DAV:'
		});
		const objects = res.objects;
		objects && objects.forEach(obj => {
			delete obj.owner;
			delete obj.data;
			var response = new xmlBuilder.XMLElementBuilder('A:response');
			response.ele('A:href').add(obj.url);
			response.ele('A:location').ele('A:href', undefined, true).add(obj.name);
			var propstat = response.ele('A:propstat');
			propstat.ele('A:status').add('HTTP/1.1 200 OK');
			var prop = propstat.ele('A:prop');
			prop.ele('A:displayname').add(obj.name.split('/').slice(-2).join(''));
			for (let p in obj) {
				prop.ele('A:' + p).add(obj[p]);
			}
			prop.ele('A:resourcetype').ele(obj.name.endsWith('/') ? 'A:collection' : 'A:file');
			prop.ele('A:quota-available-bytes').add(1024 * 1024 * 1024);
			prop.ele('A:quota-used-bytes').add(0);
			multistatus.add(response);
		});
		// debug(multistatus.toXML());
		// 写出response
		ctx.writeBody(multistatus);
		next();
	});
}


module.exports = server;