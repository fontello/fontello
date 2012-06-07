"use strict";


/*global nodeca, _*/


// stdlib
var url = require('url');


// 3rd-party
var qs = require('qs');


////////////////////////////////////////////////////////////////////////////////


var http = module.exports = {};


////////////////////////////////////////////////////////////////////////////////


function end(req, res, code, head, body) {
  // set headers
  _.each(head || {}, function (value, name) {
    if (null === value) {
      this.removeHeader(name);
      return;
    }

    this.setHeader(name, value);
  }, res);

  // Remove Accept-Ranges if it wasn't explicitly set
  if (!(head || {})['Accept-Ranges']) {
    res.removeHeader('Accept-Ranges');
  }

  // remove body, when it's not supposed to be sent
  if ('HEAD' === req.method) {
    // TODO: notify about smells in the code :))
    body = null;
  }

  //
  // Set some obligatory headers
  //

  res.setHeader('Server', 'Sansung Calakci');
  res.setHeader('Date',   (new Date).toUTCString());

  // TODO: log access info

  //
  // We don't give a shit about Content-Length as Node.JS will take care of it.
  //

  // set status code and send body (if any)
  res.statusCode = code;
  res.end(body);
}


////////////////////////////////////////////////////////////////////////////////


function parse_query(req) {
  if (!req.query) {
    req.query = (-1 === req.url.indexOf('?')) ? {}
              : qs.parse(url.parse(req.url).query);
  }

  return req.query;
}


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
  var body;

  //
  // user asks for request termination providing:
  //
  //    - statusCode  (Number)
  //    - headers     (Object)        Optional
  //    - body        (String|Buffer) Optional
  //

  if (err.statusCode) {
    end(req, res, err.statusCode, err.headers || {}, err.body);
    return;
  }

  //
  // exceptions or fatal fuckup happened
  //

  body = ('development' !== nodeca.runtime.env) ? 'Application error'
       : (err.stack || err.toString());

  nodeca.logger.error(err.stack || err.toString());
  end(req, res, 500, {'Content-Type': 'text/plain; charset=utf-8'}, body);
}


function finalize(err) {
  /*jshint validthis:true*/

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

  // redirects request to correct vhost if needed
  nodeca.filters.before('', {weight: -100}, require('./http/fix_vhost'));

  // run renderer
  nodeca.filters.after('', {weight: 100}, require('./http/renderer'));

  //
  // Define application runner
  //

  server.on('request', function app_server(req, res) {
    var query  = parse_query(req),
        match  = nodeca.runtime.router.match(clean_req_url(req)),
        // mix GET QUERY params (part after ? in URL) and params from router
        // params from router take precedence
        params = _.extend({}, query, (match || {}).params);

    if (!match) {
      // Route not found
      end(req, res, 404, {'Content-Type': 'text/plain'}, 'Not Found');
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
