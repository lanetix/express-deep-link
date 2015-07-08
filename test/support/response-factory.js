'use strict';

module.exports = function (options) {
  var opts = options || {};

  return {
    cookie: opts.cookie || function noop () {
    },
    clearCookie: opts.clearCookie || function noop () {
    },
    redirect: opts.redirect || function noop () {
    }
  };
};
