"use strict";


/*global nodeca, _*/


////////////////////////////////////////////////////////////////////////////////


var http = module.exports = {};


////////////////////////////////////////////////////////////////////////////////


function app_server(req, res) {
  var host = req.headers.host, env, match, params;

  if (-1 === nodeca.runtime.router.__vhosts__.known.indexOf(host)) {
    host = nodeca.runtime.router.__vhosts__.default_host;
  }

  if (host) {
    host = '//' + host;
  }

  match = nodeca.runtime.router.match(host + req.url.split('?').shift());

  if (!match) {
    // TODO: Fix not found handling
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  // prefill environment
  env = {
    origin: {
      http: {
        req: req,
        res: res
      }
    },
    request: {
      origin: 'HTTP',
      method: match.meta.name,
      namespace: match.meta.name.split('.').shift()
    },
    response: {
      data: {},
      headers: {},
      layout: 'default',
      view: match.meta.name
    }
  };

  // mix GET QUERY params (part after ? in URL) and params from router
  // params from router tke precedence
  params = _.extend(req.query || {}, match.params || {});
  nodeca.filters.run(match.meta.name, params, match.meta.func, function (err) {
    // set required headers
    _.each(env.response.headers || {}, function (value, name) {
      res.setHeader(name, value);
    });

    if (err && err.redirect) {
      res.statusCode = err.redirect[0];
      res.setHeader('Location', err.redirect[1]);
      res.end();
      return;
    } else if (err && err.denied) {
      res.statusCode = 403;
      res.end(err.message || 'Forbidden');
      return;
    } else if (err) {
      nodeca.logger.error(err.stack || err.toString());

      res.statusCode = 500;
      res.end(('development' !== nodeca.runtime.env) ? 'Application error'
              : (err.stack || err.toString()));
      return;
    }

    // success render view
    res.end(env.response.body);
  }, env); // nodeca.filters.run
}


////////////////////////////////////////////////////////////////////////////////


http.attach = function attach(server, next) {
  nodeca.filters.before('', require('./http/fix_vhost'));
  nodeca.filters.before('', require('./http/parse_query'));
  nodeca.filters.after('', require('./http/view_renderer'));

  server.on('request', app_server);
  next();
};
