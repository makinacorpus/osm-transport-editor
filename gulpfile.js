var concat = require('gulp-concat');
var gulp = require('gulp');
var jasmine = require('gulp-jasmine');
var jshint = require('gulp-jshint');
var gettext = require('gulp-angular-gettext');

gulp.task('lint', function() {
  gulp.src(['src/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
gulp.task('test', ['lint']);
gulp.task('resources', function() {
  gulp.src([
      'bower_components/fontawesome/fonts/*'
    ])
    .pipe(gulp.dest('static/fonts'));
  gulp.src([
      'bower_components/leaflet-dist/images/*'
    ])
    .pipe(gulp.dest('static/images/'));
});
gulp.task('scripts-libs', function() {
  gulp.src([
      'bower_components/osmtogeojson/osmtogeojson.js',
      'bower_components/leaflet-dist/leaflet.js',
      'bower_components/angular/angular.min.js',
      'bower_components/angular-base64/angular-base64.min.js',
      'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'bower_components/angular-cookies/angular-cookies.min.js',
      'bower_components/angular-flash/dist/angular-flash.min.js',
      'bower_components/angular-gettext/dist/angular-gettext.min.js',
      'bower_components/angular-leaflet/dist/angular-leaflet-directive.min.js',
      'bower_components/angular-route/angular-route.min.js',
      'bower_components/angular-ui-utils/keypress.min.js',
      'bower_components/restangular/dist/restangular.min.js',
      'bower_components/ngstorage/ngStorage.min.js',
      'bower_components/angular-osm/dist/osm.js'
    ])
    .pipe(concat("libs.js"))
    .pipe(gulp.dest('static'));

});
gulp.task('scripts', ['scripts-libs'], function() {
  gulp.src(['src/*.js'])
    .pipe(concat("built.js"))
    .pipe(gulp.dest('static'));
});
gulp.task('styles', function() {
  gulp.src([
      'bower_components/bootstrap/dist/css/bootstrap.min.css',
      'bower_components/bootstrap/dist/css/bootstrap-theme.min.css',
      'bower_components/leaflet-dist/leaflet.css',
      'bower_components/fontawesome/css/font-awesome.min.css'
    ])
    .pipe(concat("built.css"))
    .pipe(gulp.dest('static/css'));
});
gulp.task('pot', function () {
  return gulp.src([
      'static/index.html',
      'static/partials/*.html',
      'src/admin/*.js'])
    .pipe(gettext.extract('out.pot'))
    .pipe(gulp.dest('po'));
});
gulp.task('po', function () {
  return gulp.src('po/*.po')
    .pipe(gettext.compile({
        format: 'json'
    }))
    .pipe(gulp.dest('static/translations'));
});
gulp.task('default', ['scripts', 'resources', 'styles']);
gulp.task('watch', function () {
  gulp.watch('src/*.js', ['scripts', 'styles', 'resources', 'lint']);
});
