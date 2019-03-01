//@ts-check

const { src, dest, watch, parallel } = require('gulp');
const sass = require('gulp-sass');
const browserSync = require('browser-sync').create();

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

watch('app/scss/**/*.scss', sassTask);

exports.default = parallel(browserSyncTask, sassTask);
