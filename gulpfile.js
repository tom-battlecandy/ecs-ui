const { src, dest, watch, series, parallel } = require("gulp");
const ts = require('gulp-typescript');
const tsconfig = require('./tsconfig.json');
const rename = require('gulp-rename');
const sass = require("gulp-sass")(require("node-sass"));
const open = require('gulp-open');
const connect = require('gulp-connect');
const webpack = require('webpack-stream');
var browserSync = require('browser-sync').create();

const port = 8007;

const run = async cb => {
    console.log("Running gulp job");
    cb();
}

function transpileTs() {
    return src(['src/**/*.ts','src/**/*.tsx'])
        .pipe(ts(tsconfig.compilerOptions))
        .pipe(dest('build'));
}

function transpileSass() {
    return src("src/styles/*.scss", { base: './' })
        .pipe(sass().on('error', sass.logError))
        .pipe(rename(function (path) {
            path.dirname = '';
        }))
        .pipe(dest("dist/css/"))
}

function bundle() {
    return src('src/*.js')
        .pipe(webpack({
            mode: "development",
            devtool: 'source-map',
            entry: ['@babel/polyfill', './build/index.js'],
            output: {
                filename: 'core.js',
                libraryTarget: 'var',
                library: 'bcCore'
            },
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        loader: 'babel-loader',
                        exclude: /node_modules/,
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    },
                    {
                        test: /\.glsl$/i,
                        loader: 'webpack-glsl-loader',
                        exclude: /node_modules/,
                    }
                ]
            }
        }))
        .pipe(dest('dist'));
}

async function connectPage(cb) {
    connect.server({
        host: "0.0.0.0",
        root: 'dist',
        port,
        livereload: true
    });
    browserSync.init({
        proxy: `127.0.0.1:${port}`
    });
    cb();
}

function reloadPage(cb) {
    connect.reload();
    cb();
}

function openPage() {
    return src('dist/index.html')
        .pipe(open({ uri: `http://localhost:${port}/` }));
}

watch(['src/styles/*.scss'], series(transpileSass, reloadPage));
watch(['src/**/*.js'], series(bundle, reloadPage));
watch(['src/**/*.ts','src/**/*.tsx'], series(transpileTs, bundle, reloadPage));
watch(['src/**/*.glsl'], series(transpileTs, bundle, reloadPage));

module.exports.default = series(run, parallel(series(transpileTs, bundle), transpileSass), connectPage, openPage);