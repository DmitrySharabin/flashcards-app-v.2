//@ts-check

const { src, dest, watch, parallel, series } = require('gulp');
const sass = require('gulp-sass');
const browserSync = require('browser-sync').create();
const cleanDest = require('gulp-clean-dest');

function sassTask() {
    return src('app/scss/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(dest('app/css'))
        .pipe(browserSync.stream());
}

function browserSyncTask() {
    browserSync.init({
        server: {
            baseDir: 'app'
        },
        files: 'app/*.html',
    });
}

function buildSass() {
    return src('app/scss/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(dest('dist/css'));
}

function copyFiles() {
    return src(['app/**/*.json', 'app/index.html'])
        .pipe(dest('dist'));

}

function clear(cb) {
    cleanDest('dist');
    cb();
}

function watchFiles(cb) {
    watch('app/scss/**/*.scss', sassTask);
    cb();
}

exports.build = series(clear, parallel(buildSass, copyFiles));

exports.default = parallel(browserSyncTask, sassTask);
