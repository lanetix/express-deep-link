var index    = require('../');
var request  = require('./support/request-factory');
var response = require('./support/response-factory');
var sinon    = require('sinon');
var url      = require('url');

describe('deep linking middleware', function() {
  var req, res, cookieOptions, next, cookie, middleware, authenticated,
      redirect, clearCookie, BASE_URL = 'https://localhost:3000', DEFAULT_COOKIE_OPTIONS = { httpOnly : true },
      returnUrl, localLoginOptions;

  beforeEach(function() {
    authenticated = sinon.stub();
    next          = sinon.spy();
    redirect      = sinon.spy();
    clearCookie   = sinon.spy();
    cookie        = sinon.spy();
  });

  describe('when accessing the authenticated option', function() {
    describe('when the authenticated option is falsy', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ login : '/login' }); }).toThrow();
      });
    });

    describe('when authenticated is truthy', function() {
      it('should not trigger an exception', function() {
        expect(function() { index({ authenticated : authenticated, login : { local : {  path : '/login'  } } }); }).not.toThrow();
      });
    });
  });

  describe('when accessing the login option', function() {
    describe('when the login option is not present', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : undefined }); }).toThrow();
      });
    });

    describe('when neither the login.remote or login.local options are present', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : {} }); }).toThrow();
      });
    });

    describe('when both the login.remote and login.local options are present', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : { remote: {}, local : {} } }); }).toThrow();
      });
    });

    describe('when the login.remote option is present but the login.remote.url option is not present', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : { remote: {} } }); }).toThrow();
      });
    });

    describe('when the login.remote option is present and the login.remote.url option is present', function() {
      it('should not result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : { remote: { url : 'https://www.hotwire.com' } } }); }).not.toThrow();
      });
    });

    describe('when the login.local option is present but the login.local.path option is not present', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : { local : {} } }); }).toThrow();
      });
    });

    describe('when the login.local option is present but the login.local.path does not begin with a forward slash', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : { local : { path : 'login' } } }); }).toThrow();
      });
    });

    describe('when the login.local option is present and the login.local.path option begins with a forward slash', function() {
      it('should not result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : { local : { path : '/login' } } }); }).not.toThrow();
      });
    });
  });

  describe('when the request is authenticated', function() {
    beforeEach(function() {
      authenticated.returns(true);

      res = response({ redirect : redirect, clearCookie: clearCookie });
    });

    describe('when there is no return url, and the request path is equal to the login.local.path option', function() {
      beforeEach(function() {
        localLoginOptions = { local : { path : '/login', authenticated : {} } };
        middleware        = index({ authenticated : authenticated, login : localLoginOptions  });
        req               = request({ path : '/login' });
      });

      describe('when the login.local.authenticated.home option is a string', function() {
        beforeEach(function() {
          localLoginOptions.local.authenticated.home = '/my/home/route';
        });

        it('should not invoke the next middleware in the pipeline', function() {
          middleware(req, res, next);

          expect(next.called).toBe(false);
        });

        it('should prevent the login page from being served to authenticated users and redirect to the login.local.authenticated.home option', function() {
          middleware(req, res, next);

          expect(redirect.calledWithExactly('/my/home/route')).toBe(true);
        });
      });

      describe('when the login.local.authenticated.home option is truthy', function() {
        beforeEach(function() {
          localLoginOptions.local.authenticated.home = true;
        });

        it('should not invoke the next middleware in the pipeline', function() {
          middleware(req, res, next);

          expect(next.called).toBe(false);
        });

        it('should prevent the login page from being served to authenticated users and redirect to the / (root) url', function() {
          middleware(req, res, next);

          expect(redirect.calledWithExactly('/')).toBe(true);
        });
      });

      describe('when the login.local.authenticated.home option is falsy', function() {
        beforeEach(function() {
          localLoginOptions.local.authenticated.home = null;
        });

        it('should not redirect', function() {
          middleware(req, res, next);

          expect(redirect.called).toBe(false);
        });

        it('should invoke the next middleware in the pipeline and allow the login page to be potentially served to authenticated users', function() {
          middleware(req, res, next);

          expect(next.calledOnce).toBe(true);
        });
      });

      describe('when the login.local.authenticated option is not present', function() {
        beforeEach(function() {
          delete localLoginOptions.local.authenticated;
        });

        it('should not redirect', function() {
          middleware(req, res, next);

          expect(redirect.called).toBe(false);
        });

        it('should invoke the next middleware in the pipeline and allow the login page to be potentially served to authenticated users', function() {
          middleware(req, res, next);

          expect(next.calledOnce).toBe(true);
        });
      });

      describe('when the login.local.authenticated.home option is not present', function() {
        beforeEach(function() {
          delete localLoginOptions.local.authenticated.home;
        });

        it('should not redirect', function() {
          middleware(req, res, next);

          expect(redirect.called).toBe(false);
        });

        it('should invoke the next middleware in the pipeline and allow the login page to be potentially served to authenticated users', function() {
          middleware(req, res, next);

          expect(next.calledOnce).toBe(true);
        });
      });
    });

    describe('when a return url is present and the cookie.name option is present', function() {
      beforeEach(function() {
        returnUrl  = encodeURIComponent('http://i.hack.you.com/via/xss');
        req        = request({ cookies : { 'BLAH' : returnUrl }, path : '/home' });
        middleware = index({
          authenticated : authenticated,
          cookie: { name : 'BLAH' },
          login : { local : { path : '/login', authenticated : { home : true } } }
        });
      });

      it('should purge the return url from the response using the name of the cookie provided by the cookie option', function() {
        middleware(req, res, next);

        expect(clearCookie.calledWithExactly('BLAH')).toBe(true);
      });
    });

    describe('when a return url is present and the cookie.name option is not present', function() {
      beforeEach(function() {
        returnUrl  = encodeURIComponent('http://i.hack.you.com/via/xss');
        req        = request({ cookies : { returnUrl : returnUrl }, path : '/home' });
        middleware = index({
          authenticated : authenticated,
          login : { local : { path : '/login', authenticated : { home : true  } } }
        });
      });

      it('should purge the return url from the response using the default cookie name', function() {
        middleware(req, res, next);

        expect(clearCookie.calledWithExactly('returnUrl')).toBe(true);
      });
    });

    describe('when no baseUrl option is present', function() {
      beforeEach(function() {
        returnUrl  = encodeURIComponent('http://i.hack.you.com/via/xss');
        req        = request({ cookies : { returnUrl : returnUrl }, path : '/home' });
        middleware = index({
          authenticated : authenticated,
          login : { local : { path : '/login', authenticated : { home : true } } }
        });
      });

      it('should not invoke the next middleware in the pipeline', function() {
        middleware(req, res, next);

        expect(next.called).toBe(false);
      });

      it('should redirect to the return url without verifying that the return url is relative to any particular url', function() {
        middleware(req, res, next);

        expect(redirect.calledWithExactly('http://i.hack.you.com/via/xss')).toBe(true);
      });
    });

    describe('when the baseUrl option is present', function() {
      beforeEach(function() {
        returnUrl  = encodeURIComponent('http://i.hack.you.com/via/xss');
        req        = request({ cookies : { returnUrl : returnUrl }, path : '/home' });
        middleware = index({
          authenticated : authenticated,
          login : { local : { path : '/login', authenticated : { home : true } } },
          baseUrl : BASE_URL
        });
      });

      describe('when a return url that is relative to the baseUrl option is present', function() {
        beforeEach(function() {
          returnUrl = encodeURIComponent(url.resolve(BASE_URL, 'the/booty-butt-naked/truth'));
          req       = request({ cookies : { returnUrl : returnUrl } });
        });

        it('should not invoke the next middleware in the pipeline', function() {
          expect(next.called).toBe(false);
        });

        it('should redirect to the return url', function() {
          middleware(req, res, next);

          expect(redirect.calledWithExactly(url.resolve(BASE_URL, 'the/booty-butt-naked/truth'))).toBe(true);
        });
      });

      describe('when a return url that is not relative to the baseUrl option is present', function() {
        beforeEach(function() {
          returnUrl  = encodeURIComponent('http://i.hack.you.com/via/xss');
          req        = request({ cookies : { returnUrl : returnUrl } });
          middleware = index({
            authenticated : authenticated,
            baseUrl : BASE_URL,
            login : { local : { path : '/login', authenticated : { home : true } } }
          });
        });

        it('should not redirect to the invalid return url', function() {
          try { middleware(req, res, next); } catch(e) { }

          expect(redirect.called).toBe(false);
        });

        it('should not invoke the next middleware in the pipeline', function() {
          expect(next.called).toBe(false);
        });

        it('should result in an exception being thrown', function() {
          expect(function() { middleware(req, res, next); }).toThrow();
        });
      });
    });

    describe('when a return url is not present', function() {
      beforeEach(function() {
        req = request({ path : '/foreign' });
        middleware = index({
          authenticated : authenticated,
          login : { local : { path : '/login', authenticated : { home : true } } }
        });
      });

      it('should not redirect', function() {
        middleware(req, res, next);

        expect(redirect.called).toBe(false);
      });

      it('should not purge the non existent return url from the response', function() {
        middleware(req, res, next);

        expect(clearCookie.called).toBe(false);
      });

      it('should invoke the next middleware in the pipeline', function() {
        middleware(req, res, next);

        expect(next.calledOnce).toBe(true);
      });
    });
  });

  describe('when the request is unauthenticated', function() {
    beforeEach(function() {
      authenticated.returns(false);

      req   = request({ path : '/wal-mart', originalUrl : '/search?q=something' });
      res   = response({ cookie : cookie, redirect : redirect });
    });

    describe('when the cookie option is present (irrespective of the local or remote options)', function() {
      beforeEach(function() {
        cookieOptions = { secure : true, httpOnly : false };
        middleware    = index({
          authenticated : authenticated,
          cookie : { name : 'BLAH', options : cookieOptions },
          login : { local : { path : '/login' } }
        });
      });

      it('should create a uri encoded return url using the original url of the request and allow the default cookie settings to be overriden', function() {
        middleware(req, res, next);

        expect(cookie.calledWithExactly('BLAH', '%2Fsearch%3Fq%3Dsomething', cookieOptions)).toBe(true);
      });
    });

    describe('when the cookie option is present and the baseUrl option is present (irrespective of the local or remote options)', function() {
      beforeEach(function() {
        cookieOptions = { secure : true, httpOnly : false };
        middleware    = index({
          authenticated : authenticated,
          cookie : { name : 'BLAH', options : cookieOptions },
          login : { local : { path : '/login' } },
          baseUrl : 'https://www.contoso.com/'
        });
      });

      it('should create a uri encoded return url using the base url and the original url of the request and allow the default cookie settings to be overriden', function() {
        middleware(req, res, next);

        expect(cookie.calledWithExactly('BLAH', 'https%3A%2F%2Fwww.contoso.com%2Fsearch%3Fq%3Dsomething', cookieOptions)).toBe(true);
      });
    });

    describe('when the cookie option is not present (irrespective of the login.local or login.remote options)', function() {
      beforeEach(function() {
        middleware = index({
          authenticated : authenticated,
          login : { local : { path : '/login' } }
        });
      });

      it('should create a uri encoded return url using the original url of the request and the default cookie settings', function() {
        middleware(req, res, next);

        expect(cookie.calledWithExactly('returnUrl', '%2Fsearch%3Fq%3Dsomething', DEFAULT_COOKIE_OPTIONS)).toBe(true);
      });
    });

    describe('when the cookie option is not present and the baseUrl option is present (irrespective of the login.local or login.remote options)', function() {
      beforeEach(function() {
        middleware = index({
          authenticated : authenticated,
          login : { local : { path : '/login' } },
          baseUrl : 'https://www.contoso.com/'
        });
      });

      it('should create a uri encoded return url using the base url and the original url of the request and the default cookie settings', function() {
        middleware(req, res, next);

        expect(cookie.calledWithExactly('returnUrl', 'https%3A%2F%2Fwww.contoso.com%2Fsearch%3Fq%3Dsomething', DEFAULT_COOKIE_OPTIONS)).toBe(true);
      });
    });

    describe('when the login.remote.url option is present', function() {
        beforeEach(function() {
          middleware = index({
            authenticated : authenticated,
            login : { remote : { url : 'https://my.secure.site.com/' }  }
          });
        });

        it('should not invoke the next middleware in the pipeline', function() {
          middleware(req, res, next);

          expect(next.called).toBe(false);
        });

        it('should redirect to the login.remote.url option', function () {
          middleware(req, res, next);

          expect(redirect.calledWithExactly('https://my.secure.site.com/')).toBe(true);
        });
    });

    describe('when the login.local.path option is present', function () {
      beforeEach(function() {
        middleware = index({
          authenticated : authenticated,
          login : { local: { path : '/login' }  }
        });
      });

      describe('when the path of the current request matches the login.local.path option', function() {
        beforeEach(function() {
          req = request({ path : '/login' });
        });

        it('should not redirect to any path or url', function () {
          middleware(req, res, next);

          expect(redirect.called).toBe(false);
        });

        it('should not create a uri encoded return url', function() {
          middleware(req, res, next);

          expect(cookie.called).toBe(false);
        });

        it('should invoke the next middleware in the pipeline and allow the login page to be served w/o an infinite redirect', function() {
          middleware(req, res, next);

          expect(cookie.called).toBe(false);
        });
      });

      describe('when the path of the current request does not match the login.local.path option', function() {
        beforeEach(function() {
          req = request({ path : 'login' });
        });

        it('should not invoke the next middleware in the pipeline', function() {
          middleware(req, res, next);

          expect(next.called).toBe(false);
        });

        it('should redirect to the login.local.path option', function () {
          middleware(req, res, next);

          expect(redirect.calledWithExactly('/login')).toBe(true);
        });
      });
    });
  });
});
