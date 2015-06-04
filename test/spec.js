var index    = require('../');
var request  = require('./support/request-factory');
var response = require('./support/response-factory');
var sinon    = require('sinon');
var url      = require('url');

describe('deep linking middleware', function() {
  var req, res, cookieOptions, next, login, cookie, middleware, authenticated,
      redirect, clearCookie, BASE_URL = 'https://localhost:3000', DEFAULT_COOKIE_OPTIONS = { httpOnly : true },
      returnUrl;

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
        expect(function() { index({ authenticated : authenticated, login : '/login' }); }).not.toThrow();
      });
    });
  });

  describe('when accessing the login option', function() {
    describe('when the login option is falsy', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : undefined }); }).toThrow();
      });
    });

    describe('when the login option is an empty string', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : '' }); }).toThrow();
      });
    });

    describe('when the login option is not a string or function', function() {
      it('should result in an exception being thrown', function() {
        expect(function() { index({ authenticated : authenticated, login : 2 }); }).toThrow();
      });
    });

    describe('when the login option is a string', function() {
      it('should not trigger an exception', function() {
        expect(function() { index({ authenticated : authenticated, login : '/logout' }); }).not.toThrow();
      });
    });

    describe('when the login option is a function', function() {
      it('should not trigger an exception', function() {
        expect(function() { index({ authenticated : authenticated, login : sinon.spy() }); }).not.toThrow();
      });
    });
  });

  describe('when the request is authenticated', function() {
    beforeEach(function() {
      authenticated.returns(true);

      res = response({ redirect : redirect, clearCookie: clearCookie });
    });

    describe('when no baseUrl option is present', function() {
      beforeEach(function() {
        middleware = index({ authenticated : authenticated, login : '/login' });
        returnUrl  = encodeURIComponent('http://i.hack.you.com/via/xss');
        req        = request({ cookies : { returnUrl : returnUrl } });
      });

      describe('when the cookie.name option is present', function() {
        beforeEach(function() {
          req        = request({ cookies : { 'BLAH' : returnUrl } });
          middleware = index({ authenticated : authenticated, cookie: { name : 'BLAH' }, login : '/login' });
        });

        it('should purge the return url from the response using the name of the cookie provided by the cookie option', function() {
          middleware(req, res, next);

          expect(clearCookie.calledWithExactly('BLAH')).toBe(true);
        });
      });

      describe('when the cookie.name option is not present', function() {
        beforeEach(function() {
          middleware = index({ authenticated : authenticated, login : '/login' });
        });

        it('should purge the return url from the response using the default cookie name', function() {
          middleware(req, res, next);

          expect(clearCookie.calledWithExactly('returnUrl')).toBe(true);
        });
      });

      it('should not invoke the next middleware in the pipeline', function() {
        expect(next.called).toBe(false);
      });

      it('should redirect to the return url', function() {
        middleware(req, res, next);

        expect(redirect.calledWithExactly('http://i.hack.you.com/via/xss')).toBe(true);
      });
    });

    describe('when the baseUrl option is present', function() {
      describe('when a return url that is relative to the baseUrl option is present', function() {
        beforeEach(function() {
          returnUrl = encodeURIComponent(url.resolve(BASE_URL, 'the/booty-butt-naked/truth'));
          req       = request({ cookies : { returnUrl : returnUrl } });
        });

        describe('when the cookie.name option is present', function() {
          beforeEach(function() {
            req        = request({ cookies : { 'BLAH' : returnUrl } });
            middleware = index({ authenticated : authenticated, cookie: { name : 'BLAH' }, login : '/login' });
          });

          it('should purge the return url from the response using the name of the cookie provided by the cookie option', function() {
            middleware(req, res, next);

            expect(clearCookie.calledWithExactly('BLAH')).toBe(true);
          });
        });

        describe('when the cookie.name option is not present', function() {
          beforeEach(function() {
            middleware = index({ authenticated : authenticated, login : '/login' });
          });

          it('should purge the return url from the response using the default cookie name', function() {
            middleware(req, res, next);

            expect(clearCookie.calledWithExactly('returnUrl')).toBe(true);
          });
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
          middleware = index({ authenticated : authenticated, baseUrl : BASE_URL, login : '/login' });
        });

        it('should result in an exception being thrown', function() {
          expect(function() { middleware(req, res, next); }).toThrow();
        });

        it('should not redirect to the invalid return url', function() {
          try { middleware(req, res, next); } catch(e) { }

          expect(redirect.called).toBe(false);
        });
      });
    });

    describe('when a return url is not present', function() {
      beforeEach(function() {
        req = request();
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

      login = sinon.spy();
      req   = request({ originalUrl : 'https://www.google.com' });
      res   = response({ cookie : cookie, redirect : redirect });
    });

    describe('when the cookie option is present', function() {
      beforeEach(function() {
        cookieOptions = { secure : true, httpOnly : false };
        middleware    = index({ authenticated : authenticated, cookie : { name : 'BLAH', options : cookieOptions }, login : '/logout' });
      });

      it('should create a uri encoded return url using the original url of the request and allow the default cookie settings to be overriden', function() {
        middleware(req, res, next);

        expect(cookie.calledWithExactly('BLAH', 'https%3A%2F%2Fwww.google.com', cookieOptions)).toBe(true);
      });
    });

    describe('when the cookie option is not present', function() {
      beforeEach(function() {
        middleware = index({ authenticated : authenticated, login : '/logout' });
      });

      it('should create a uri encoded return url using the original url of the request and the default cookie settings', function() {
        middleware(req, res, next);

        expect(cookie.calledWithExactly('returnUrl', 'https%3A%2F%2Fwww.google.com', DEFAULT_COOKIE_OPTIONS)).toBe(true);
      });
    });

    describe('when the login option is a function', function() {
      beforeEach(function() {
        middleware = index({ authenticated : authenticated, login : login });
      });

      it('should invoke the function provided by the login option passing in the response as input', function() {
        middleware(req, res, next);

        expect(login.calledWithExactly(res)).toBe(true);
      });
    });

    describe('when the login option is a string', function() {
      beforeEach(function() {
        middleware = index({ authenticated : authenticated, login : 'https://login.my.secure.site.com/' });
      });

      it('should redirect to the value provided by the login option', function() {
        middleware(req, res, next);

        expect(redirect.calledWithExactly('https://login.my.secure.site.com/')).toBe(true);
      });
    });
  });
});
