// - Read incoming cookies on request start.
// - Add helper to get/set cookies.
// - Write 'Set-Cookie' headers on request end.
//
// This hook must be on responder channel to prevent `error_process` hook from
// dropping 'Set-Cookie' headers set by this hook.


'use strict';


const cookie = require('cookie');


module.exports = function (N) {

  // Parse cookies
  //
  N.wire.before([ 'responder:http', 'responder:rpc' ], { priority: -5 }, function cookies_read(env) {

    // Helper to read incoming cookies from client.
    function getCookie(name) {
      return getCookie.storage[name];
    }
    getCookie.storage = {};

    // Helper to write outgoing cookies from server.
    function setCookie(name, value, options = {}) {
      setCookie.storage[name] = { value, options };
    }
    setCookie.storage = {};

    // Parse incoming request cookies.
    if (env.origin.req.headers.cookie) {
      try {
        getCookie.storage = cookie.parse(env.origin.req.headers.cookie);
      } catch (err) {
        env.err = err;
        return;
      }
    }

    // Expose.
    env.extras.getCookie = getCookie;
    env.extras.setCookie = setCookie;
  });


  // Send cookies that must be set on the client
  //
  N.wire.after([ 'responder:http', 'responder:rpc' ], { priority: 95 }, function cookies_write(env) {
    let c = [];

    // Prepare list of cookies to send.
    for (let [ name, data ] of Object.entries(env.extras.setCookie.storage)) {
      let defaults = {
        httpOnly: true,
        path: '/'
      };

      // On https use secure cookies by default
      if (env.req.isEncrypted) { defaults.secure = true; }

      let options = Object.assign(defaults, data.options);

      try {
        c.push(cookie.serialize(name, data.value, options));
      } catch {}
    }

    if (c.length) env.headers['Set-Cookie'] = c;
  });
};
