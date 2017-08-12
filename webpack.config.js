module.exports = {
  entry: './lib/interpreter.ts',
  output: {
    filename: './dist/interpreter.global.js',
    library: 'Interpreter'
  },

  devtool: 'source-map',

  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {loader: 'ts-loader', options: { configFileName: 'tsconfig.webpack.json' }}
        ]
      }
    ]
  }
};