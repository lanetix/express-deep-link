module.exports = function(options) {
  var opts = options || {};

  return {
    authenticated : !!opts.authenticated,
    cookies       : opts.cookies || {},
    originalUrl   : opts.originalUrl,
    path          : opts.path
  };
};
