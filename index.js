var _ = require('lodash');

function validateOptions(options) {
  var localAndRemoteLoginAreBothProvided = options.login && options.login.local && options.login.remote,
      loginPath;

  if (!options.login) {
    throw new Error('the login option is required.');
  }

  if(localAndRemoteLoginAreBothProvided) {
    throw new Error('the login.local and login.remote options are mutually exclusive (exactly one should be provided).');
  }

  if (options.login.local) {
    if (!options.login.local.path) {
      throw new Error('the login.local.path option must be provided.');
    }

    loginPath = options.login.local.path;

    if (loginPath.indexOf('/') !== 0) {
       throw new Error('the login.local.path option must begin with a foward /');
    }
  } else if (options.login.remote) {
    if (!options.login.remote.url) {
      throw new Error('the login.remote.url option must be provided.');
    }
  } else {
    throw new Error('either the login.local or login.remote option must be provivded.');
  }

  if (!options.authenticated) {
    throw new Error('the authenticated option must be provided as a function.');
  }
}

function processAuthenticatedRequest(req, res, next, options) {
  var cookieName                                 = (options.cookie && options.cookie.name) || 'returnUrl',
      returnUrl                                  = req.cookies[cookieName], returnUrlIsRelativeToBaseUrl,
      redirectRequestsToTheLocalLoginRouteToHome = options.login.local && req.path === options.login.local.path
                                                  && options.login.local.authenticated && options.login.local.authenticated.home;

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
  } else if (redirectRequestsToTheLocalLoginRouteToHome) {
    if (_.isString(options.login.local.authenticated.home)) {
      res.redirect(options.login.local.authenticated.home);
    } else {
      res.redirect('/');
    }
  } else {
    next();
  }
}

function processUnauthenticatedRequest(req, res, next, options) {
  var cookieName             = (options.cookie && options.cookie.name) || 'returnUrl',
    localLoginRouteRequested = options.login.local && req.path === options.login.local.path,
    DEFAULT_COOKIE_OPTIONS   = { httpOnly : true },
    loginUrl, cookieOptions;

  if (options.login.local) {
    loginUrl = options.login.local.path;
  } else {
    loginUrl = options.login.remote.url;
  }

  if (localLoginRouteRequested) {
    next();
  } else {
    cookieOptions = (options.cookie && options.cookie.options) || {};
    cookieOptions = _.defaults(cookieOptions, DEFAULT_COOKIE_OPTIONS);

    res.cookie(cookieName, encodeURIComponent(req.originalUrl), cookieOptions);
    res.redirect(loginUrl);
  }
}

module.exports = function(options) {
  var authenticated;

  validateOptions(options);

  return function(req, res, next) {
    authenticated = options.authenticated.call(undefined, req);

    if (authenticated) {
      processAuthenticatedRequest(req, res, next, options);
    } else {
      processUnauthenticatedRequest(req, res, next, options);
    }
  };
};
