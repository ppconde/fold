const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
	mode: 'development',
	entry: {
		app: './src/js/index.jsx',
	},
	devtool: 'inline-source-map',
	devServer: {
		contentBase: './dist',
	},
	module: {
		rules: [
			{
				test: /\.s[ac]ss$/i,
				use: ['style-loader', 'css-loader', 'sass-loader',],
			},
			{
				test: /.(png|jpe?g|gif)$/i,
				type: 'asset/resource'
			},
			{
				test: /\.svg$/,
				use: [
					{
						loader: '@svgr/webpack'
					},
					{
						loader: 'file-loader'
					}
				],
				type: 'javascript/auto',
				issuer: {
					and: [/\.(ts|tsx|js|jsx|md|mdx)$/]
				}
			},
			{
				test: /.(fold)$/i,
				use: [
					{
						loader: 'json-loader'
					},
				],
			},
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: ['babel-loader'],
			},
		],
	},
	resolve: {
		extensions: ['*', '.js', '.jsx'],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new HtmlWebpackPlugin({
			title: 'Fold',
			template: './index.html',
		}),
	],
	output: {
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist'),
	},
};
