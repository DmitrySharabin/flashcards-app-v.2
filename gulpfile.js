//@ts-check

const { src, dest, watch, parallel, series } = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const cleanDest = require('gulp-clean-dest');
const workboxBuild = require('workbox-build');

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
        .pipe(autoprefixer({
			browsers: ["cover 90%", "since 2016"],
			cascade: false
		}))
        .pipe(dest('dist/css'));
}

function copyFiles() {
    return src(['app/**/*', '!app/{scss,scss/**}'])
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

// See: https://developers.google.com/web/tools/workbox/guides/generate-service-worker/workbox-build
function buildSW() {
  // This will return a Promise
  return workboxBuild.generateSW({
    globDirectory: 'dist',
    globPatterns: [
      '**\/*.{html,json,js,css}',
    ],
    swDest: 'dist/sw.js',

    // Define runtime caching rules.
    runtimeCaching: [{
        // Match any request ends with .png, .jpg, .jpeg or .svg.
        urlPattern: /\.(?:png|jpg|jpeg|svg)$/,

        // Apply a cache-first strategy.
        handler: 'CacheFirst',

        options: {
          // Use a custom cache name.
          cacheName: 'images',

          // Only cache 10 images.
          expiration: {
            maxEntries: 10,
          },
        },
      },
      {
        // Cache the Google Fonts stylesheets with a stale-while-revalidate strategy.
        urlPattern: new RegExp('^https:\/\/fonts\.googleapis\.com'),

        handler: 'StaleWhileRevalidate',

        options: {
          cacheName: 'google-fonts-stylesheets',
        },
      },
      {
        // Cache the underlying font files with a cache-first strategy for 1 year.
        urlPattern: new RegExp('^https:\/\/fonts\.gstatic\.com/'),

        handler: 'CacheFirst',

        options: {
          cacheName: 'google-fonts-webfonts',

          cacheableResponse: {
            statuses: [0, 200],
          },

          expiration: {
            maxAgeSeconds: 60 * 60 * 24 * 365,
            maxEntries: 30,
          }
        },
      },
      {
        // Cache CSS, JavaScript and JSON Files.
        urlPattern: /\.(?:css|js|json)$/,

        handler: 'StaleWhileRevalidate',

        options: {
          cacheName: 'static-resources',

          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Cache the Font Awesome stylesheets with a stale-while-revalidate strategy.
        urlPattern: /.*font\-awesome.*\.css/,

        handler: 'StaleWhileRevalidate',

        options: {
          cacheName: 'font-awesome-stylesheet',
        },
      },
      {
        // Cache the underlying font files with a cache-first strategy for 1 year.
        urlPattern: /.fontawesome\-webfont\.woff$/,

        handler: 'CacheFirst',

        options: {
          cacheName: 'font-awesome-webfont',

          cacheableResponse: {
            statuses: [0, 200],
          },

          expiration: {
            maxAgeSeconds: 60 * 60 * 24 * 365,
            maxEntries: 30,
          }
        },
      }
    ],
  });
}

exports.build = series(clear, parallel(buildSass, copyFiles), buildSW);

exports.default = parallel(watchFiles, browserSyncTask, sassTask);
