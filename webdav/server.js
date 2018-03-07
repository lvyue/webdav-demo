const webdav = require('webdav-server').v2;
const debug = require('debug')('webdav');
const AliOss = require('@webdav-server/ali-oss');
const github = require('@webdav-server/github');
const config = require('../config');
const path = require('path');
const server = new webdav.WebDAVServer({
	autoLoad: {
		serializers: [
			new AliOss.AliOssSerializer()
			// new github.GitHubSerializer()
		]
	},
	rootFileSystem: new AliOss.AliOssFileSystem(config.oss.region, config.oss.bucket, config.oss.accessKeyId, config.oss.accessKeySecret)
});

server.beforeRequest((ctx, next) => {
	debug(ctx.request.method, ctx.request.url);
	next();
});
server.afterRequest((ctx, next) => {
	debug(ctx.request.method, ctx.request.url, ctx.response.statusCode, ctx.response.statusMessage, ctx.request.path);
	next();
});
// server.setFileSystemSync('/', new AliOss.AliOssFileSystem(config.oss.region, config.oss.bucket, config.oss.accessKeyId, config.oss.accessKeySecret), false);
// server.setFileSystemSync('/ali-oss/', new github.GitHubFileSystem('lvyue', 'webdav-test', ' Iv1.096aed38de55c704', '84086a1712ebedfc98aec90a0074fa5d3223f671'), true);
// server.setFileSystemSync('/ali-oss/', new webdav.PhysicalFileSystem(__dirname), true);

// server.start((s) => debug('Ready on port', s.address().port));
module.exports = server;