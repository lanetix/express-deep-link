var _ = require('lodash');

module.exports = function(options) {
  var returnUrl, cookieOptions, returnUrlIsRelativeToBaseUrl, authenticated,
      cookieName, DEFAULT_COOKIE_OPTIONS , loginIsValid;

  DEFAULT_COOKIE_OPTIONS = { httpOnly : true };
  cookieName             = (options.cookie && options.cookie.name) || 'returnUrl';
  loginIsValid           = options.login && ((_.isString(options.login) && options.login.length) || _.isFunction(options.login));

  if(!loginIsValid) {
    throw new Error('the login option must be a string or function');
  }

  if (!options.authenticated) {
    throw new Error('the authenticated option must be provided as a function');
  }

  return function(req, res, next) {
    authenticated = options.authenticated.call(undefined, req);

    if (authenticated) {
      returnUrl = req.cookies[cookieName];

      if (returnUrl) {
        returnUrl = decodeURIComponent(returnUrl);

        if (options.baseUrl) {
          returnUrlIsRelativeToBaseUrl = returnUrl.indexOf(options.baseUrl) === 0;

          if (!returnUrlIsRelativeToBaseUrl) {
            throw new Error('returnUrl must be relative to baseUrl');
          }
        }

        res.clearCookie(cookieName);
        res.redirect(returnUrl);
      } else {
        next();
      }
    } else {
      cookieOptions = (options.cookie && options.cookie.options) || {};
      cookieOptions = _.defaults(cookieOptions, DEFAULT_COOKIE_OPTIONS);

      res.cookie(cookieName, encodeURIComponent(req.originalUrl), cookieOptions);

      if (_.isString(options.login)) {
        res.redirect(options.login);
      } else {
        options.login.call(undefined, res);
      }
    }
  };
};
