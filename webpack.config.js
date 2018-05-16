const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = {
  entry: {
    content: [
      './app/src/content.js'
    ],
    test:[
      './app/src/test.js'
    ]
  },
  output: {
    path: path.resolve(__dirname, 'app/build'),
    filename: '[name].js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader'
      },
      {
        test: /\.vue$/,
        loader: "vue-loader",
        options: {
          loaders: {
            'scss': "vue-style-loader!css-loader!sass-loader"
          }
        }
      },
      {
        test: /\.pug$/,
        loader: "pug-loader"
      },

    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Facebook post downloader',
      template: 'views/index.pug',
      filename: 'index.html',
      inject: 'head',
      alwaysWriteToDisk: true,
      excludeChunks: ["content"]
    }),

    new webpack.ProvidePlugin({
      $: "jquery",
    }),

    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),

    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        drop_console: true,
      },
      mangle: true
    })

  ],
  resolve: {
    extensions: ['.js', '.vue'],
    alias: {
      'vue': 'vue/dist/vue.js'
    }
  },
  stats: {
    colors: true
  },

  amd: {
    jQuery: true
  },
  devtool: 'source-map'
};