let config;
if (process.env.NODE_ENV === 'production') {
	config = require('./prod');
} else if (process.env.NODE_ENV === 'test') {
	config = require('./test');
} else {
	config = require('./dev');
}


module.exports = config;