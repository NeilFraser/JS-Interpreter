module.exports = {
    devtool: 'source-map',
    entry: [
        './src/interpreter.js',
    ],
    output: {
        library: 'js-interpreter',
        libraryTarget: 'umd',
        path: 'lib',
        filename: 'index.js',
    },
};
