const OSS = require('ali-oss');
const co = require('co');
const debug = require('debug')('oss');
const client = new OSS({
    region: 'oss-cn-beijing',
    accessKeyId: 'LTAIbGtv3U0m6cwd',
    accessKeySecret: 'UY3Yf0eQ6l5AfglJE547wo9zDi81sW',
    bucket: 'mnzld-cloud'
});


co(function* () {
    let rs;
    // // 创建文件夹
    // for (let i = 65; i < 91; i++) {
    //     rs = yield client.put('demo/' + String.fromCharCode(i) + '/', new Buffer(0));
    //     debug('Create Folder:', rs);
    // }
    // // 创建子文件夹
    // rs = yield client.put('demo/B/C/', new Buffer(0));
    // debug('Create Sub Folder:', rs);
    // 创建多级文件夹 多级文件夹可以 创建，但是是一个文件，不方便分级复制
    // rs = yield client.put('B/C/D/E/F/', new Buffer(0));
    // debug('Create Folders:', rs);

    rs = yield client.copy('demo/A/B/', 'demo/B/');
    debug('Copy Folder:', rs);
    var result = yield client.list({
        prefix: 'demo/A/',
        delimiter: '/',
        'max-keys': 20
    });
    debug('ALL:', result);
}).catch(function (err) {
    debug(err);
});