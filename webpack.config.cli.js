const path = require('path')
const webpack = require('webpack')

module.exports = {
    target: 'node',
    entry: {
        'js-interpreter': path.join(__dirname, 'src', 'cli.js'),
    },
    output: {
        path: path.join(__dirname, 'bin'),
        filename: '[name]',
    },
    plugins: [
        new webpack.BannerPlugin({
            banner: '#!/usr/bin/env node',
            raw: true,
        }),
    ],
};
