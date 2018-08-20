# twitter-oauth1.0-login
Simple implementation of Sign on with Twitter

# Why
This implementation sets out to be different by not tying itself to any framework. It makes no assumption of your application architecture and does not include more than basic functionality to get your users logged in. Similar to other implementations, it also queries the user's profile information as a form of credential verification.

# Install
    $ git clone https://github.com/idealwebsolutions/twitter-oauth1.0-login.git
    $ cd twitter-oauth1.0-login && npm install

# API
### .setup(opts) -> fn
Creates a new instance that uses the consumer key and secret as part of the OAuth signing process.

### .request(authUrl, cb) -> fn
Obtains a new request token as part of the login flow. `authUrl` is the url that is invoked when an authorization is granted, `cb` is a function that contains an `err` and `action` that contains a `redirect` key as a url for you to redirect the user to.

### .profile(params, cb) -> fn
Obtains basic profile information of the authorized user. `params` is an object that contains two keys `oauth_token` and `oauth_verifier` which can be obtained from the querystring when a successful auth callback is invoked. `cb` is a function that contains an `err` and `profile` that contains authorized profile information (can include email).

# Usage
```js
const Tw = require('twitter-oauth1.0-login')
const login = Tw.setup({
  key: YOUR_CONSUMER_KEY,
  secret: YOUR_CONSUMER_SECRET,
})

// Given we have middleware-like function...
function handleLogin (req, res, next) {
  login.request(YOUR_AUTH_CALLBACK_URL, (err, action) => {
    if (err) {
      return done(err)
    }

    res.statusCode = 302
    res.setHeader('Location', action.redirect) // this contains the url we need to redirect the end user to
    next()
  })
}

// Given we have another middleware-like function that responds to the auth callback we provided...
function handleAuth (req, res, next) {
  // Parse the querystring
  const query = require('url').parse(req.url, true).query
  // We should get an object that contains both the `oauth_token` and `oauth_verifier` query parameters
  login.profile(query, (err, profile) => {
    if (err) {
      return done(err)
    }
    // If all went well, we should have the profile information of the user that authorized the app
    req.profile = profile
    next()
  })
}
```

# License
MIT
