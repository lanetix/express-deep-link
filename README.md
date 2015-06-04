### Where Do I Plug This Into Pipeline At?

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

Authentication = require('../lib/authentication');

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
Deep linking middleware for express.
