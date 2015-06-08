Compatible with [express 4.x](http://expressjs.com/4x/api.html).

## Options
-----------

### baseUrl - String (Optional)

The `baseUrl` option is optional and is for validation/security purposes. It will ensure that the value stored inside the return url is not pointing
to a different website. For example, if your website is hosted on https://www.somedomain.com/, all return urls should begin
with this value. That is to say, they should be relative to https://www.somedomain.com/.

```js
var deep     = require('express-deep-link');
var deeplink = deep({ baseUrl : 'https://my.site.com/blah' });
var express  = require('express');
var app      = express();

app.use(deeplink);
```

### cookie - Object (Optional)

The `cookie` option can be used to override settings for how the return url is persisted as a cookie.

#### cookie.name - String (Optional)

Controls the name of the cookie on the response.

Default - `returnUrl`

```js
var deep     = require('express-deep-link');
var deeplink = deep({ cookie : { name : 'BLAH' } });
var express  = require('express');
var app      = express();

app.use(deeplink);
```

#### cookie.options - Object (Optional)

A hash of options that should conform to that of [`res.cookie`](http://expressjs.com/api.html#res.cookie).

Default - `{ httpOnly : true }`

```js
var deep     = require('express-deep-link');
var deeplink = deep({
  cookie : {
    options : {
      domain: '.example.com',
      path: '/admin',
      secure: true,
      expires: new Date(Date.now() + 900000)
      // httpOnly : true would not be necessary here since
      // it's apart of the default options
    }
  }
});
var express  = require('express');
var app      = express();

app.use(deeplink);
```

### login - Object (Required)

The `login` option is responsible for logging in an unauthenticated user. It supports both local and remote
login.

**NOTE:** The `login.local` and `login.remote` options are mutually exclusive and you must set EXACTLY ONE of
these options in order to use `deeplink`.

#### login.local - Object (Required if not using login.remote)

Instructs the middleware that the login endpoint is deployed to the same host/website (i.e. https://contoso.com/login) as
the target website (where clients will deep link into) as opposed to a remote host (i.e. https://login.contoso.com).

##### login.local.path - String (Required if using login.local)

This is the request path (equivalent to the `req.path` property of an express request) of the local login endpoint.
**It should always begin with a forward `/`** as [depicted in the express docs](http://expressjs.com/api.html#req.path).
Why is this option important? When the path of the current request is equal to this value, we will blindly allow the
request to pass through (without a redirect) so as to avoid infinite redirects. We should not be redirecting you to the
login page if you're actually trying to visit the login page...feel my drift?

```js
var deep     = require('express-deep-link');
var deeplink = deep({
  login : {
    local : {
      path : '/login'
    }
  }
});
var express  = require('express');
var app      = express();

app.use(deeplink);
```

##### login.local.authenticated - Object (Optional)

Controls options related to local authenticated requests.

###### login.local.authenticated.home - Boolean|String (Optional)

The `login.local.authenticated.home` option is a UX enhancement that prevents authenticated users from being allowed
to visit the login route (`login.local.path`). When this option is set, authenticated users will get redirected to the
`/` (root) url when the value of `home` is a `Boolean` (true), or to the value of the `home` option when it is of type
`String`.

```js
var deep     = require('express-deep-link');
var deeplink = deep({
  login : {
    local : {
      path : '/login',
      authenticated : { home : true } // Boolean
    }
  }
});
var express  = require('express');
var app      = express();

app.use(deeplink);
```

**OR**

```js
var deep     = require('express-deep-link');
var deeplink = deep({
  login : {
    local : {
      path : '/login',
      authenticated : { home : '/home' } // String
    }
  }
});
var express  = require('express');
var app      = express();

app.use(deeplink);
```

#### login.remote - Object (Required if not using login.local)

Instructs the middleware that the login endpoint is deployed to a remote (i.e. https://login.contoso.com) host/website as
opposed to the target website (i.e. https://contoso.com/login).

##### login.remote.url - String (Required if using login.remote)

This is the remote endpoint we'll redirect any unauthenticated requests to. This is different from local configuration
as no redirect will be necessary.

```js
var deep     = require('express-deep-link');
var deeplink = deep({
  login : {
    remote : {
      url : 'https://my.secure.site.com'
    }
  }
});
var express  = require('express');
var app      = express();

app.use(deeplink);
```

## Where Do I Plug This Into My Pipeline At?
---------------------------------------------

The expectation is that you'll use this middleware directly after your authentication middleware. Notice how the
`authenticated` option is synchronous. I initially thought I'd need to account for promises of async based stuff
via `function(err, result)`. That would have sucked from a coding perspective. It would have definitely increased
the overall complexity of things. Then I had a sudden epiphany that

> "hey...wait a sec...why don't I just let the authentication middleware handle it's job in the way that it wants.
..it'll tell me once it's done doing it's job via `next()`...then I can just piggy back off of the results."

That's a much clearer separation of concerns in my mind. Authentication middleware can focus on authenticating the
current user and bouncing them back to a login or elsewhere upon failure. Should everything check out, `next()` would
be invoked and we can interrogate the results of whatever key said authentication middleware writes to the request.
Let me give you an example.

```js
// middleware/authentication.js

var Authentication = require('../lib/authentication');

function(req, res, next) {
  var token = req.get('X-AUTH-TOKEN');

  if(!token) {
    /* instead of redirecting to login, give the
    *  deeplinking middleware a chance to store the
    *  current request url, and THEN redirect to login
    *  via the login option
    */
    next();
  }

  Authentication
  .authenticate(token)
  .then(function(tokenOrWhateverAuthYields) {
    // we can now pass this in as the authentication option
    req.user = tokenOrWhateverAuthYields;
    next();
  })
  .error(function(e) {
    // redirect to login since they gave us a bad token
  });
}
```

```js
// app.js

var authentication = require('./middleware/authentication')();
var deep           = require('express-deep-link');
var express        = require('express');

var deeplink = deep({
  authenticated : function() { return req.user; },
  login         : 'https://secure.login.com'
});

var app = express();

// when authentication calls next(), req.user will be populated,
// and if it's not, deeplink will cache the current url and redirect to login
app.use(authentication);
app.use(deeplink);
```

## Tests
---------

```shell
git clone git@github.com:armw4/express-deep-link.git

cd express-deep-link

npm install

npm install -g gulp

gulp test
```
