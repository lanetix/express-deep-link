var _ = require('lodash');

module.exports = function(options) {
  var returnUrl, cookieOptions, returnUrlIsRelativeToBaseUrl, authenticated,
      cookieName, DEFAULT_COOKIE_OPTIONS , remoteAndRemoteLoginAreMutuallyExclusive,
      loginUrl, preventLoginFromBeingServedToAuthenticatedUsers;

  DEFAULT_COOKIE_OPTIONS                      = { httpOnly : true };
  cookieName                                  = (options.cookie && options.cookie.name) || 'returnUrl';
  remoteAndRemoteLoginAreNotMutuallyExclusive = options.login && options.login.local && options.login.remote;

  if (!options.login) {
    throw new Error('the login option is required.');
  }

  if(remoteAndRemoteLoginAreNotMutuallyExclusive) {
    throw new Error('the login.local and login.remote options are mutually exclusive (exactly one should be provided).');
  }

  if (options.login.local) {
    if (!options.login.local.path) {
      throw new Error('the login.local.path option must be provided.');
    }

    loginUrl = options.login.local.path;
  } else if (options.login.remote) {
    if (!options.login.remote.url) {
      throw new Error('the login.remote.url option must be provided.');
    }

    loginUrl = options.login.remote.url;
  } else {
    throw new Error('either the login.local or login.remote option must be provivded.');
  }

  if (!options.authenticated) {
    throw new Error('the authenticated option must be provided as a function.');
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
            throw new Error('returnUrl must be relative to baseUrl.');
          }
        }

        res.clearCookie(cookieName);
        res.redirect(returnUrl);
      } else if (options.login.local && req.path === options.login.local.path && options.login.local.authenticated && options.login.local.authenticated.home) {
        if (_.isString(options.login.local.authenticated.home)) {
          res.redirect(options.login.local.authenticated.home);
        } else {
          res.redirect('/');
        }
      } else {
        next();
      }
    } else {
      if (options.login.local && req.path === options.login.local.path) {
        next();
      } else {
        cookieOptions = (options.cookie && options.cookie.options) || {};
        cookieOptions = _.defaults(cookieOptions, DEFAULT_COOKIE_OPTIONS);

        res.cookie(cookieName, encodeURIComponent(req.originalUrl), cookieOptions);
        res.redirect(loginUrl);
      }
    }
  };
};
