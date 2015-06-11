var _ = require('lodash'),
    url = require('url');

function validateOptions(options) {
  var localAndRemoteLoginAreBothProvided = options.login && options.login.local && options.login.remote,
      loginPath;

  if (!options.login) {
    throw new Error('the login option is required.');
  }

  if (localAndRemoteLoginAreBothProvided) {
    throw new Error('the login.local and login.remote options are mutually exclusive (exactly one should be provided).');
  }

  if (options.login.local) {
    if (!options.login.local.path) {
      throw new Error('the login.local.path option must be provided.');
    }

    loginPath = options.login.local.path;

    if (!_.startsWith(loginPath, '/')) {
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

function normalizePath(path) {
  return (_.endsWith(path, '/') ? path : path + '/').toLowerCase();
}

function processAuthenticatedRequest(req, res, next, options) {
  var cookieName = (options.cookie && options.cookie.name) || 'returnUrl',
      returnUrl = req.cookies[cookieName], returnUrlIsRelativeToBaseUrl,
      normalizedRequestPath = normalizePath(req.path),
      home = options.login.local && normalizedRequestPath === normalizePath(options.login.local.path)
             && options.login.local.authenticated && options.login.local.authenticated.home;

  if (returnUrl) {
    returnUrl = decodeURIComponent(returnUrl);

    if (options.baseUrl) {
      returnUrlIsRelativeToBaseUrl = _.startsWith(returnUrl, options.baseUrl);

      if (!returnUrlIsRelativeToBaseUrl) {
        throw new Error('returnUrl must be relative to baseUrl.');
      }
    }

    res.clearCookie(cookieName);
    res.redirect(returnUrl);
  } else if (home) {
    if (_.isString(home)) {
      res.redirect(home);
    } else {
      res.redirect('/');
    }
  } else {
    next();
  }
}

function processUnauthenticatedRequest(req, res, next, options) {
  var cookieName = (options.cookie && options.cookie.name) || 'returnUrl',
    normalizedRequestPath = normalizePath(req.path),
    localLoginRouteRequested = options.login.local && normalizedRequestPath === normalizePath(options.login.local.path),
    DEFAULT_COOKIE_OPTIONS = { httpOnly : true }, loginUrl;

  if (options.login.local) {
    loginUrl = options.login.local.path;
  } else {
    loginUrl = options.login.remote.url;
  }

  if (localLoginRouteRequested) {
    next();
  } else {
    var cookieOptions = (options.cookie && options.cookie.options) || {},
        returnUrl = options.baseUrl ? url.resolve(options.baseUrl, req.originalUrl) : req.originalUrl;

    cookieOptions = _.defaults(cookieOptions, DEFAULT_COOKIE_OPTIONS);

    res.cookie(cookieName, encodeURIComponent(returnUrl), cookieOptions);
    res.redirect(loginUrl);
  }
}

module.exports = function(options) {
  validateOptions(options);

  return function(req, res, next) {
    var authenticated = options.authenticated(req),
        getRequestIssued = req.method.toLowerCase() === 'get',
        getRequestIssuedForFavicon = getRequestIssued && normalizePath(req.path) === '/favicon.ico/';

    if (!getRequestIssued || getRequestIssuedForFavicon) {
       next();
    }
    else if (authenticated) {
      processAuthenticatedRequest(req, res, next, options);
    } else {
      processUnauthenticatedRequest(req, res, next, options);
    }
  };
};
