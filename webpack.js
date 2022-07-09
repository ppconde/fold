const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = (env) => {
	return {
		mode: env.development ? 'development' : 'production',
		entry: {
			app: './src/js/index.jsx',
		},
		devtool: 'inline-source-map',
		devServer: {
			static: './dist',
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
						and: [/\.(js|jsx|md|mdx)$/]
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
					test: /\.txt$/i,
					use: 'raw-loader',
				},
				{
					test: /\.(js|jsx)$/,
					exclude: /node_modules/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env', '@babel/preset-react']
						}
					}
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
			new Dotenv(),
		],
		output: {
			filename: '[name].bundle.js',
			path: path.resolve(__dirname, 'dist'),
			publicPath: env.development ? '/' : '/dist/',
		},
	}
};
