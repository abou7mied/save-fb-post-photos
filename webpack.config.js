const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');

const config = {
  entry: {
    content: [
      './app/src/content.js',
    ],
    test: [
      './app/src/test.js',
    ],
  },
  output: {
    path: path.resolve(__dirname, 'app/build'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
            scss: 'vue-style-loader!css-loader!sass-loader',
            pug: 'pug-plain-loader',
          },
        },
      },
      {
        test: /\.pug$/,
        loader: 'pug-plain-loader',
      },
    ],
  },
  plugins: [
    new WriteFilePlugin(),

    new HtmlWebpackPlugin({
      title: 'Facebook post downloader',
      template: 'views/index.html',
      filename: 'index.html',
      inject: 'head',
      alwaysWriteToDisk: true,
      excludeChunks: ['content'],
    }),

    new webpack.ProvidePlugin({
      $: 'jquery',
    }),

    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
    new WebpackBuildNotifierPlugin({
      title: 'Done',
      // logo: path.resolve("./img/favicon.png"),
      suppressSuccess: false, // don't spam success notifications
    }),
  ],
  resolve: {
    extensions: ['.js', '.vue'],
    alias: {
      vue: 'vue/dist/vue.js',
    },
  },
  stats: {
    colors: true,
  },

  amd: {
    jQuery: true,
  },
  devtool: 'cheap-module-source-map',
  watchOptions: {
    ignored: /node_modules/,
  },
};

module.exports = config;
