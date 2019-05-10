const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const WriteFilePlugin = require('write-file-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';


const config = {
  entry: {
    vendor: [
      'vue',
      'jquery',
      'jszip',
      'pdfmake/build/pdfmake.min.js',
      './app/src/vfs_fonts.js',
      'sanitize-filename',
      'file-saver',
    ],
    content: [
      './app/src/content.js',
    ],
    background: [
      'jquery',
      './app/src/background.js',
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
          },
        },
      },
      {
        test: /\.pug$/,
        loader: 'pug-loader',
      },

    ],
  },
  plugins: [
    new WriteFilePlugin(),

    new HtmlWebpackPlugin({
      title: 'Facebook post downloader',
      template: 'views/index.pug',
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
  devtool: 'source-map',
  watchOptions: {
    ignored: /node_modules/,
  },
};



module.exports = config;
