// Build robots.txt file from config & hooks
//
// That's not planned for wide use, because we can control robots via meta tags.
// But it's convenient for injections. For example, to announce sitemap location.
//
'use strict';


module.exports = function (N, apiPath) {

  N.validate(apiPath, {});

  // Build body & headers manually
  N.wire.on(apiPath, function robots_txt_config(env) {
    env.body = env.body || '';
    env.headers['Content-Type'] = 'text/plain; charset=utf-8';

    if (N.config.robots) {
      env.body += N.config.robots;

      if (env.body[env.body.length - 1] !== '\n') env.body += '\n';
    }
  });

};
