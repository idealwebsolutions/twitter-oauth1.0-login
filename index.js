const { createHmac } = require('crypto')
const { parse } = require('querystring')

const OAuth = require('oauth-1.0a')
const { concat } = require('simple-get')

const REQUEST_TOKEN_ENDPOINT = 'https://api.twitter.com/oauth/request_token'
const AUTHENTICATION_ENDPOINT = 'https://api.twitter.com/oauth/authenticate'
const ACCESS_TOKEN_ENDPOINT = 'https://api.twitter.com/oauth/access_token'

const VALIDATE_CREDENTIALS_ENDPOINT = 'https://api.twitter.com/1.1/account/verify_credentials.json'

module.exports = class TwitterLogin {
  constructor (opts) {
    if (!opts.key) {
      throw new Error('Consumer key is required')
    }

    if (!opts.secret) {
      throw new Error('Consumer secret is required')
    }

    this._oauth = OAuth({
      consumer: {
        key: opts.key,
        secret: opts.secret
      },
      signature_method: 'HMAC-SHA1',
      hash_function: (base, key) => {
        return createHmac('sha1', key).update(base).digest('base64')
      }
    })

    this._token = ''
    this._tokenSecret = ''
  }

  static setup (opts) {
    return new TwitterLogin(opts)
  }

  request (authUrl, cb) {
    if (typeof cb !== 'function') {
      throw new Error('Callback was not defined')
    }

    if (typeof authUrl !== 'string') {
      return cb(new Error('Authentication callback url was not defined'), null)
    }

    const url = REQUEST_TOKEN_ENDPOINT
    const data = {
      callback: encodeURI(authUrl)
    }

    concat({
      url: url,
      method: 'POST',
      headers: this._oauth.toHeader(this._oauth.authorize({
        url: url,
        method: 'POST'
      }, data))
    }, (err, res, data) => {
      if (err) {
        return cb(err, null)
      }

      if (res.statusCode !== 200) {
        return cb(new Error('Invalid status code'), null)
      }

      const body = parse(data.toString())

      if (!body.oauth_callback_confirmed) {
        return cb(new Error('Authentication callback was not confirmed'), null)
      }

      this._token = body.oauth_token
      this._tokenSecret = body.oauth_token_secret

      cb(null, {
        redirect: `${AUTHENTICATION_ENDPOINT}?oauth_token=${this._token}`
      })
    })
  }

  profile (opts = {}, cb) {
    const token = opts.oauth_token
    const verifier = opts.oauth_verifier

    if (typeof cb !== 'function') {
      throw new Error('Callback not defined')
    }

    if (typeof token !== 'string') {
      return cb(new Error('Token was not defined'), null)
    }

    if (typeof verifier !== 'string') {
      return cb(new Error('Verifier was not defined'), null)
    }

    if (this._token !== token) {
      return cb(new Error('Tokens do not match'), null)
    }

    const url = `${ACCESS_TOKEN_ENDPOINT}?oauth_verifier=${verifier}`

    const data = {
      key: token
    }

    const headers = this._oauth.toHeader(this._oauth.authorize({
      url: url,
      method: 'POST'
    }, data))

    headers['Content-Type'] = 'application/x-www-form-urlencoded'

    concat({
      url: url,
      method: 'POST',
      headers: headers
    }, (err, res, data) => {
      if (err) {
        return cb(err, null)
      }

      if (res.statusCode !== 200) {
        return cb(new Error('Invalid status code'), null)
      }

      const body = parse(data.toString())

      this._token = body.oauth_token
      this._tokenSecret = body.oauth_token_secret

      this._validate((err, profile) => {
        if (err) {
          return cb(err, null)
        }

        cb(null, profile)
      })
    })
  }

  _validate (cb) {
    if (typeof cb !== 'function') {
      throw new Error('Callback is not defined')
    }

    const url = `${VALIDATE_CREDENTIALS_ENDPOINT}?include_email=true`
    const data = {
      key: this._token,
      secret: this._tokenSecret
    }

    const headers = this._oauth.toHeader(this._oauth.authorize({
      url: url,
      method: 'GET'
    }, data))

    headers['Content-Type'] = 'application/x-www-form-urlencoded'

    concat({
      url: url,
      method: 'GET',
      headers: headers,
      json: true
    }, (err, res, data) => {
      if (err) {
        return cb(err, null)
      }

      if (res.statusCode !== 200) {
        return cb(new Error('Invalid status code'), null)
      }

      cb(null, data)
    })
  }
}
