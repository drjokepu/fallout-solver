var prod = process.argv.indexOf('--prod') !== -1;
var webpack = require("webpack");

module.exports = [{
	target: 'web',
	entry: {
		index: './jsx/index.jsx'
	},
	output: {
		path: './dist',
		filename: '[name].js'
	},
	module: {
		loaders: [{
			test: /\.jsx?$/,
			exclude: /(node_modules|bower_components)/,
			loader: 'babel'
		}, {
			test: /\.less$/,
			loader: 'style!css!less'
		}]
	},
	plugins: prod ? [
		new webpack.optimize.UglifyJsPlugin({ minimize: true })
	] : []
}];