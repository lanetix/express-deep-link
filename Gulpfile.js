var gulp    = require('gulp');
var jasmine = require('gulp-jasmine');

gulp.task('test', function() {
  return gulp
        .src(['lib/**/*.js', 'test/**/{*.spec.js,spec.js}'])
        .pipe(jasmine({ verbose: true }));
});
