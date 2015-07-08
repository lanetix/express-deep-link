'use strict';

var gulp = require('gulp'),
  mocha = require('gulp-mocha');

gulp.task('test', function () {
  return gulp
    .src(['lib/**/*.js', 'test/**/{*.spec.js,spec.js}'], {read: false})
    .pipe(mocha());
});
