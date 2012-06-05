"use strict";


/*global nodeca, _*/


////////////////////////////////////////////////////////////////////////////////


var http = module.exports = {};


////////////////////////////////////////////////////////////////////////////////


function end(req, res, code, head, body) {
  var no_body = (code === 204 || code === 304 || (100 <= code && code <= 199));

  // set headers
  _.each(head || {}, function (value, name) {
    this.setHeader(name, value);
  }, res);

  // remove body, when it's not supposed to be sent
  if ('HEAD' === req.method || no_body) {
    // TODO: notify about smells in the code :))
    body = null;
  }

  // TODO: log access info

  // set status code and send body (if any)
  res.statusCode = code;
  res.end(body);
}


////////////////////////////////////////////////////////////////////////////////


function clean_req_url(req) {
  var host = req.headers.host;

  if (-1 === nodeca.runtime.router.__vhosts__.known.indexOf(host)) {
    host = nodeca.runtime.router.__vhosts__.default_host;
  }

  if (host) {
    host = '//' + host;
  }

  return host + req.url.split('?').shift();
}


function process_error(req, res, err) {
  if (err.redirect) {
    end(res, err.redirect[0], {'Location': err.redirect[1]});
    return;
  }

  if (err.denied) {
    nodeca.logger.warn('Access denied: ' + (err.message || err.toString()));
    end(res, 403, {}, 'Forbidden');
    return;
  }

  // handle generic error
  nodeca.logger.error(err.stack || err.toString());
  end(res, 500, {}, ('development' !== nodeca.runtime.env) ? 'Application error'
                    : (err.stack || err.toString()));
}


function finalize(err) {
  if (err) {
    process_error(this.origin.http.req, this.origin.http.res, err);
    return;
  }

  // success return body
  end(this.origin.http.req,
      this.origin.http.res,
      this.response.statusCode || 200,
      this.response.headers,
      this.response.body);
}


////////////////////////////////////////////////////////////////////////////////


http.attach = function attach(server, next) {

  //
  // Assign middlewares/hooks
  //

  nodeca.filters.before('', require('./http/fix_vhost'));
  nodeca.filters.before('', require('./http/parse_query'));
  nodeca.filters.after('',  require('./http/view_renderer'));

  //
  // Define application runner
  //

  server.on('request', function app_server(req, res) {
    var match  = nodeca.runtime.router.match(clean_req_url(req)),
        // mix GET QUERY params (part after ? in URL) and params from router
        // params from router take precedence
        params = _.extend({}, req.query, (match || {}).params);

    if (!match) {
      // Route not found
      end(req, res, 404, {}, "Not Found.");
      return;
    }

    nodeca.filters.run(match.meta.name, params, match.meta.func, finalize, {
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
    });
  });

  //
  // HTTP server is ready
  //

  next();
};
