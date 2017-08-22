const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
  entry: ['./lib/acorn_interpreter.ts'],
  output: {
    filename: './dist/acorn_interpreter.js',
    library: 'Interpreter'
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
          {loader: 'ts-loader', options: { configFileName: 'tsconfig.webpack.json' }}
        ]
      }
    ]
  },

  plugins: [
    new UglifyJSPlugin({
      compress: {warnings: false},
      output: {comments: function(node, comment) {
        return /^!/.test(comment.value);
      }},
      sourceMap: true
    })
  ]
};