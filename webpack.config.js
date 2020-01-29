const path    = require('path');
const webpack = require('webpack');

module.exports = [
    {
        mode  : 'production',
        entry : path.resolve(__dirname, 'src', 'js-interpreter.js'),
        output: {
            filename     : 'js-interpreter.js',
            globalObject : 'this',
            library      : 'JSInterpreter',
            libraryExport: 'default',
            libraryTarget: 'umd',
            path         : path.resolve(__dirname, 'lib'),
        },
        plugins: [
            new webpack.ProvidePlugin({
                'acorn': path.resolve(__dirname, 'original-repo', 'acorn.js')
            })
        ],
    },
    {
        mode  : 'production',
        entry : path.resolve(__dirname, 'src', 'cli.js'),
        target: 'node',
        output: {
            filename     : 'cli.js',
            path         : path.resolve(__dirname, 'lib'),
        },
        plugins: [
            new webpack.ProvidePlugin({
                'acorn': path.resolve(__dirname, 'original-repo', 'acorn.js')
            }),
            new webpack.BannerPlugin({
                banner: '#!/usr/bin/env node',
                raw   : true,
            }),
        ],
    },
];
