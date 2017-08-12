const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
  entry: ['./lib/acorn.js', './lib/global.ts'],
  output: {
    filename: './dist/acorn_interpreter.js'
  },

  devtool: 'source-map',

  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015']
          }
        }
      },
      {
        test: /\.tsx?$/,
        use: [
          {loader: 'ts-loader'}
        ]
      }
    ]
  },

  plugins: [
    new UglifyJSPlugin()
  ]
};