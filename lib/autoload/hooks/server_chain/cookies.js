// - load cookies on request start
// - add helper to store cookies
// - autosave cookies on request end
//

'use strict';


var _      = require('lodash');
var cookie = require('cookie');


module.exports = function (N) {

  // Parse cookies
  //
  N.wire.before('server_chain:*', { priority: -90 }, function cookies_start(env, callback) {

    // Helper to read incoming cookies from client.
    function getCookie(name) {
      return getCookie.storage[name];
    }
    getCookie.storage = {};

    // Helper to write outgoing cookies from server.
    function setCookie(name, value, options) {
      setCookie.storage[name] = { value: value, options: options || {} };
    }
    setCookie.storage = {};

    // Parse incoming request cookies.
    if (env.origin.req.headers.cookie) {
      try {
        getCookie.storage = cookie.parse(env.origin.req.headers.cookie);
      } catch (err) {
        callback(err);
        return;
      }
    }

    // Expose.
    env.extras.getCookie = getCookie;
    env.extras.setCookie = setCookie;
    callback();
  });


  // Send cookies that must be set on the client
  //
  N.wire.after('server_chain:*', { priority: 90, ensure: true }, function cookies_end(env, callback) {
    var cookies = [];

    // prepare list of cookies to be sent
    _.each(env.extras.setCookie.storage, function (data, name) {
      var options = _.extend({
        httpOnly: true
      , path: '/'
      }, data.options);

      cookies.push(cookie.serialize(name, data.value, options));
    });

    env.headers['Set-Cookie'] = cookies;
    callback();
  });
};
