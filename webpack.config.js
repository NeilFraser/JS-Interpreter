const path = require('path')

module.exports = {
    entry: {
        index: [path.join(__dirname, 'src', 'interpreter.js')],
    },
    output: {
        library: 'js-interpreter',
        libraryTarget: 'umd',
        path: path.join(__dirname, 'lib'),
        filename: '[name].js',
    },
};
