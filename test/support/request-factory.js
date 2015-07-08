'use strict';

module.exports = function (options) {
  var opts = options || {},
    caseInsensitiveGet = 'GeT';

  return {
    authenticated: !!opts.authenticated,
    cookies: opts.cookies || {},
    originalUrl: opts.originalUrl,
    path: opts.path,
    method: opts.method || caseInsensitiveGet
  };
};
