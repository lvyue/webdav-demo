const OSS = require('ali-oss').Wrapper;
const debug = require('debug')('webdav');
const config = require('../config');
const _ = require('lodash');
const path = require('path');

// 创建索引
const client = new OSS(config.oss);

exports.client = client;
/**
 * 复制文件
 * @param { String } usr 用户前缀
 * @param { String } from 
 * @param { String } to 
 * @param { Function} callback 
 */
exports.copy = function copy(usr, from, to, callback) {
	if (_.isFunction(callback)) {
		client.copy(usr + '/' + to, usr + '/' + from).then(rs => (callback(null, rs))).catch(callback);
	} else {
		return client.copy(usr + '/' + to, usr + '/' + from);
	}
};

/**
 *  查询列表
 * @param { String } usr 
 * @param { Object } options 
 * @param { Function } callback   回掉函数，可选，不传参数时返回一个promise
 */
exports.list = function list(usr, options, callback) {
	if (!_.isString(usr)) {
		throw new Error('usr must be string');
	}
	if (_.isFunction(options)) {
		callback = options;
		options = {};
	} else if (!_.isObject(options)) {
		options = {};
	}
	options.prefix = usr + (options.prefix || '');
	if (options.marker) {
		options.marker = usr + (options.marker || '');
	}
	debug('List Options:', options);
	if (_.isFunction(callback)) {
		client.list(options).then(rs => (callback(null, rs))).catch(callback);
	} else {
		return client.list(options);
	}
};



/**
 *  创建文件夹
 * @param {*} usr 
 * @param {*} dest 
 * @param {*} callback 
 */
exports.createFolder = function createFolder(usr, dest, callback) {
	if (!_.isString(usr)) {
		throw new Error('usr must be string');
	}
	dest = usr + dest;
	if (!dest.endsWith('/')) {
		dest += '/';
	}
	if (_.isFunction(callback)) {
		client.put(dest, Buffer.alloc(0)).then(rs => (callback(null, rs))).catch(callback);
	} else {
		return client.put(dest, Buffer.alloc(0));
	}
};
/**
 *  移动文件/文件夹
 * @param {*} usr 
 * @param {*} source  源文件 / 文件夹
 * @param {*} target  目标文件夹
 * @param {*} callback 
 */
exports.mv = function mv(usr, source, target, callback) {

};