const webdav = require('webdav-server').v2;
// const debug = require('debug')('webdav');
const AliOss = require('@webdav-server/ali-oss');
// const github = require('@webdav-server/github');
const config = require('../config');
// const path = require('path');
// const fs = require('fs');

const um = new webdav.SimpleUserManager();
const user = um.addUser('admin', 'admin', true);

const pm = new webdav.SimplePathPrivilegeManager();
pm.setRights(user, config.dav.path, ['all']);

const server = new webdav.WebDAVServer({
	requireAuthentification: true,
	httpAuthentication: new webdav.HTTPBasicAuthentication(um, 'Basic'),
	userManager: um,
	privilegeManager: pm,
	autoLoad: {
		serializers: [
			new AliOss.AliOssSerializer()
			// new github.GitHubSerializer()
		]
	},
	// rootFileSystem: new webdav.PhysicalFileSystem(__dirname)
	rootFileSystem: new AliOss.AliOssFileSystem(config.oss.region, config.oss.bucket, config.oss.accessKeyId, config.oss.accessKeySecret)
});

// server.method('PUT', {
// 	isValidFor(ctx, type) {
// 		return !type || type.isFile;
// 	},
// 	chunked(ctx, inputStream, callback) {
// 		inputStream.pipe(fs.createWriteStream(__dirname + '/a.png', {
// 			autoClose: true
// 		}));
// 		callback();
// 	},
// 	unchunked(ctx, data, callback) {
// 		debug(data);
// 		callback();
// 	}
// });
// server.setFileSystemSync('/', new AliOss.AliOssFileSystem(config.oss.region, config.oss.bucket, config.oss.accessKeyId, config.oss.accessKeySecret), false);
// server.setFileSystemSync('/ali-oss/', new github.GitHubFileSystem('lvyue', 'webdav-test', ' Iv1.096aed38de55c704', '84086a1712ebedfc98aec90a0074fa5d3223f671'), true);
// server.setFileSystemSync('/ali-oss/', new webdav.PhysicalFileSystem(__dirname), true);

// server.start((s) => debug('Ready on port', s.address().port));
module.exports = server;