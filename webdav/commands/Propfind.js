const webdav = require('webdav-server').v2;
const RequestContext = webdav.HTTPRequestContext;
const HTTPCodes = webdav.HTTPCodes;
const xmlBuilder = require('xml-js-builder');
const Errors = webdav.Errors;
const http = require('http');
const oss = require('../oss');
const debug = require('debug')('webdav');
const async = require('async');
const _ = require('lodash');

function parseRequestBody(ctx, data) {
	var allTrue = {
		leftElements: [],
		mustDisplay: function () {
			return true;
		},
		mustDisplayValue: function () {
			return true;
		}
	};
	var onlyName = {
		leftElements: [],
		mustDisplay: function () {
			return true;
		},
		mustDisplayValue: function () {
			return false;
		}
	};
	if (ctx.headers.contentLength <= 0)
		return allTrue;
	try {
		var xml = xmlBuilder.XML.parse(data);
		var propfind = xml.find('DAV:propfind');
		if (propfind.findIndex('DAV:propname') !== -1)
			return onlyName;
		if (propfind.findIndex('DAV:allprop') !== -1)
			return allTrue;
		var prop_1 = propfind.find('DAV:prop');
		var fn = function (name) {
			var index = prop_1.findIndex(name);
			if (index === -1)
				return false;
			prop_1.elements.splice(index, 1);
			return true;
		};
		return {
			leftElements: prop_1.elements,
			mustDisplay: fn,
			mustDisplayValue: function () {
				return true;
			}
		};
	} catch (ex) {
		return allTrue;
	}
}

function propstatStatus(status) {
	return 'HTTP/1.1 ' + status + ' ' + http.STATUS_CODES[status];
}

function PropFind() {
	if (!(this instanceof PropFind)) {
		return new PropFind();
	}
	return this;
}


PropFind.prototype.addXMLInfo = function (ctx, data, resource, multistatus, depth, _callback) {
	let that = this;
	let body = parseRequestBody(ctx, data);
	let objects = resource.objects || [];
	let prefixes = (resource.prefixes || []).map(prefix => ({
		'name': prefix,
		type: 2
	}));
	async.eachLimit(_.concat(objects, prefixes), 2, (item, done) => {
		if (item.type === 2) { // 文件夹
			debug('NAME:', item.name);
			oss.list('', {
				'prefix': item.name,
				'max-keys': 1
			}).then(es => {
				debug('es:', es);
				that.addXMLInfo(ctx, data, es, multistatus, depth, done);
			});
		} else {
			var response = new xmlBuilder.XMLElementBuilder('D:response');
			var callback = function (e) {
				if (e === Errors.MustIgnore)
					e = null;
				else if (!e)
					multistatus.add(response);
				else {
					var errorNumber = RequestContext.defaultStatusCode(e);
					if (errorNumber !== null) {
						var response_1 = new xmlBuilder.XMLElementBuilder('D:response');
						response_1.ele('D:propstat').ele('D:status').add('HTTP/1.1 ' + errorNumber + ' ' + http.STATUS_CODES[errorNumber]);
						response_1.ele('D:href', undefined, true).add(item.name);
						response_1.ele('D:location').ele('D:href', undefined, true).add(item.name);
						multistatus.add(response_1);
					}
				}
				done(e);
			};
			var propstat = response.ele('D:propstat');
			propstat.ele('D:status').add('HTTP/1.1 200 OK');
			var prop = propstat.ele('D:prop');

			var tags = {};

			let mustDisplayTag = function (name) {
				if (body.mustDisplay('DAV:' + name))
					tags[name] = {
						el: prop.ele('D:' + name),
						value: body.mustDisplayValue('DAV:' + name)
					};
				else
					tags[name] = {
						value: false
					};
			};
			mustDisplayTag('getlastmodified');
			mustDisplayTag('lockdiscovery');
			mustDisplayTag('supportedlock');
			mustDisplayTag('creationdate');
			mustDisplayTag('resourcetype');
			mustDisplayTag('displayname');
			mustDisplayTag('getetag');
			debug('TAGS:', tags);
			let displayValue = function displayValue(values, fn) {
				debug('Values:', values);
				if (values.constructor === String ? tags[values].value : values.some(function (n) {
					debug('N:', n);
					return tags[n].value;
				})) {
					fn();
				}
			};
			displayValue('creationdate', function () {
				tags.creationdate.el.add(item.creationdate || item.lastModified);
			});
			// displayValue('lockdiscovery', function () {
			// 	resource.listDeepLocks(function (e, locks) {
			// 		if (e)
			// 			return nbOut(e);
			// 		for (var path in locks) {
			// 			for (var _i = 0, _a = locks[path]; _i < _a.length; _i++) {
			// 				var _lock = _a[_i];
			// 				var lock = _lock;
			// 				var activelock = tags.lockdiscovery.el.ele('D:activelock');
			// 				activelock.ele('D:lockscope').ele('D:' + lock.lockKind.scope.value.toLowerCase());
			// 				activelock.ele('D:locktype').ele('D:' + lock.lockKind.type.value.toLowerCase());
			// 				activelock.ele('D:depth').add('Infinity');
			// 				if (lock.owner)
			// 					activelock.ele('D:owner').add(lock.owner);
			// 				activelock.ele('D:timeout').add('Second-' + (lock.expirationDate - Date.now()));
			// 				activelock.ele('D:locktoken').ele('D:href', undefined, true).add(lock.uuid);
			// 				activelock.ele('D:lockroot').ele('D:href', undefined, true).add(RequestContext.encodeURL(ctx.fullUri(path)));
			// 			}
			// 		}
			// 		nbOut(null);
			// 	});
			// });
			let isDirectory = item.name.endsWith('/');
			response.ele('D:href', undefined, true).add(item.name);
			response.ele('D:location').ele('D:href', undefined, true).add(item.url);
			if (tags.resourcetype && tags.resourcetype.value && isDirectory)
				tags.resourcetype.el.ele('D:collection');
			if (!isDirectory) {
				mustDisplayTag('getcontentlength');
				mustDisplayTag('getcontenttype');
				if (tags.getcontenttype && tags.getcontenttype.value) {
					tags.getcontenttype.el.add('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
				}
				if (tags.getcontentlength && tags.getcontentlength.value) {
					tags.getcontentlength.el.add(item.size === undefined || item.size === null || item.size.constructor !== Number ? 0 : item.size);
				}
			}
			displayValue('displayname', function () {
				tags.displayname.el.add(item.name.split('/').split(-2).join(''));
			});
			// displayValue('supportedlock', function () {
			// 	item.availableLocks(function (e, lockKinds) {
			// 		return process.nextTick(function () {
			// 			if (e) {
			// 				nbOut(e);
			// 				return;
			// 			}
			// 			lockKinds.forEach(function (lockKind) {
			// 				var lockentry = tags.supportedlock.el.ele('D:lockentry');
			// 				var lockscope = lockentry.ele('D:lockscope');
			// 				lockscope.ele('D:' + lockKind.scope.value.toLowerCase());
			// 				var locktype = lockentry.ele('D:locktype');
			// 				locktype.ele('D:' + lockKind.type.value.toLowerCase());
			// 			});
			// 			nbOut();
			// 		});
			// 	});
			// });
			displayValue('getlastmodified', function () {
				if (tags.getlastmodified && tags.getlastmodified.value)
					tags.getlastmodified.el.add(item.lastModified);
			});
			displayValue('getetag', function () {
				if (tags.getetag && tags.getetag.value)
					tags.getetag.el.add(item.etag);
			});
			for (let name in item) {
				if (body.mustDisplay(name)) {
					let tag = prop.ele(name);
					if (body.mustDisplayValue(name)) {
						let property = item[name];
						if (tag.attributes)
							for (let attName in property.attributes)
								tag.attributes[attName] = property.attributes[attName];
						else
							tag.attributes = property.attributes;
						tag.add(property.value);
					}
				}
			}
			callback();
		}

	}, _callback);

};
PropFind.prototype.unchunked = function (ctx, data, callback) {
	var that = this;
	debug('===================================================PROP FIND=================================================');
	debug(ctx.requested, ctx.headers, data.toString('utf-8'));
	const path = ctx.requested.path.toString(true);
	// const nbPaths = ctx.requested.path.paths.length;
	// const method = ctx.headers.find('trace-method', '*').toLowerCase();
	// const separator = ctx.headers.find('trace-separator', '\r\n');
	const traceDepth = parseInt(ctx.headers.find('trace-depth', 'infinity').toLowerCase());
	const iDepth = parseInt(ctx.headers.find('depth', 'infinity').toLowerCase());
	const depth = isNaN(traceDepth) ? isNaN(iDepth) ? 0 : iDepth : traceDepth; // 设置深度
	const opts = {
		prefix: path
	};
	if (depth === 0) {
		opts['max-keys'] = 1;

	} else if (depth > 0) {
		opts.marker = path;
		opts.delimiter = '/';
	}
	oss.list('demo', opts).then(res => {
		debug('List:', res);
		const objects = res.objects;
		if (objects && objects.length > 0) { // 存在且唯一
			if (depth === 0) { // 一级信息
				const file = objects[0];
				delete file.owner;
				let multistatus = new xmlBuilder.XMLElementBuilder('D:multistatus', {
					'xmlns:D': 'DAV:'
				});
				let response = new xmlBuilder.XMLElementBuilder('A:response');
				response.ele('A:href').add(file.url);
				response.ele('A:location').ele('A:href', undefined, true).add(file.name);
				let propstat = response.ele('A:propstat');
				propstat.ele('A:status').add(propstatStatus(HTTPCodes.OK));
				let prop = propstat.ele('A:prop');
				prop.ele('A:displayname').add(file.name.split('/').slice(-2).join(''));
				for (let p in file) {
					prop.ele('A:' + p).add(file[p]);
				}
				if (file.name.endsWith('/')) {
					prop.ele('A:getcontentlength').add(0);
				}
				prop.ele('A:resourcetype').ele(file.name.endsWith('/') ? 'A:collection' : 'A:file');
				prop.ele('A:quota-available-bytes').add(1024 * 1024 * 1024);
				prop.ele('A:quota-used-bytes').add(0);
				multistatus.add(response);
				ctx.writeBody(multistatus);
				callback();
			} else {
				let multistatus = new xmlBuilder.XMLElementBuilder('D:multistatus', {
					'xmlns:D': 'DAV:'
				});
				let done = function (err) {
					if (err) {
						ctx.setCode(HTTPCodes.InternalServerError);
					} else {
						ctx.setCode(HTTPCodes.MultiStatus);
						ctx.writeBody(multistatus);
					}
					callback();
				};
				that.addXMLInfo(ctx, data, res, multistatus, depth, done);
			}
		} else { // 文件夹

		}
	});
	// ctx.getResource(function (e, resource) {
	// 	ctx.checkIfHeader(resource, function () {
	// 		
	// 	});
	// });
};
PropFind.prototype.isValidFor = function (ctx, type) {
	return !!type;
};
module.exports = PropFind;