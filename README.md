### Options
-----------

#### baseUrl - String

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

#### cookie - Object

The `cookie` option can be used to override settings for how the return url is persisted as a cookie.

##### cookie.name - String

Controls the name of the cookie on the response.

Default - `returnUrl`

```js
var deep     = require('express-deep-link');
var deeplink = deep({ cookie : { name : 'BLAH' } });
var express  = require('express');
var app      = express();

app.use(deeplink);
```

##### cookie.options - Object

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

#### login - String|Function

The `login` option is responsible for logging in an unauthenticated user. `String` and `Function` are supported.

##### String

If `login` is a string, redirection will be handled internally via `deeplink`.

```js
var deep     = require('express-deep-link');
var deeplink = deep({ login : 'https://my.secure.site.com/auth' });
var express  = require('express');
var app      = express();

app.use(deeplink);
```

##### Function

If `login` is a function, that function will be invoked with the current response and will be responsible for redirecting the user.

```js
var deep     = require('express-deep-link');
var deeplink = deep({
  login : function(res) {
    // do something funky before the redirect
    res.redirect('some funky friggin place mang');
  }
});

var express  = require('express');
var app      = express();

app.use(deeplink);
```

### Where Do I Plug This Into My Pipeline At?
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
