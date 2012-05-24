"use strict";


/*global nodeca, _*/


// stdlib
var path    = require('path');
var crypto  = require('crypto');


// nodeca
var HashTree = require('nlib').Support.HashTree;


// 3rd-party
var Mincer  = require('mincer');
var connect = require('connect');


// internal
var realtime = require('./realtime');


////////////////////////////////////////////////////////////////////////////////


var http = module.exports = {};


////////////////////////////////////////////////////////////////////////////////


function fix_vhost(config) {
  return function (req, res, next) {
    var host = (req.headers.host || '').split(':')[0];

      // if no host in config - then we accept any host
    if (!config.host) {
      next();
      return;
    }

    // known hostname
    if (host === config.host) {
      next();
      return;
    }

    // fix hostname by redirect
    host = config.host;
    if (config.port && 80 !== config.port) {
      host += ':' + config.port;
    }

    res.writeHead(301, {'Location': "http://" + host});
    res.end();
  };
}


function downloads_server(root) {
  var FINGERPRINT_RE  = /-([0-9a-f]{32,40})\.[^.]+$/,
      options         = {root: root};

  return function (req, res, next) {
    var match = FINGERPRINT_RE.exec(req.url), filename;

    options.path    = req.url;
    options.getOnly = true;

    if (match) {
      // beautify zipball name
      filename = 'filename=fontello-' + match[1].substr(0, 8) + '.zip';
      res.setHeader('Content-Disposition', 'attachment; ' + filename);
    }

    connect.static.send(req, res, next, options);
  };
}


function static_server(root) {
  var static_urls = ['/favicon.ico', '/robots.txt', '/snippet.png'],
      options     = {root: root};

  return function (req, res, next) {
    if (-1 === static_urls.indexOf(req.url)) {
      next();
      return;
    }

    options.path    = req.url;
    options.getOnly = true;

    connect.static.send(req, res, next, options);
  };
}


////////////////////////////////////////////////////////////////////////////////


function app_server() {
  var static_helpers = {};

  static_helpers.asset_path = function (path) {
    var asset = nodeca.runtime.assets.environment.findAsset(path);
    return !asset ? "#" : ("/assets/" + asset.digestPath);
  };

  static_helpers.asset_inline = function (path) {
    var asset = nodeca.runtime.assets.environment.findAsset(path);
    return !asset ? "" : asset.toString();
  };

  static_helpers.config = function (part) {
    return !part ? nodeca.config : HashTree.get(nodeca.config, part);
  };

  static_helpers.count_online_users = function () {
    return realtime.activeClients + 1;
  };

  static_helpers.app_secret = function () {
    var rnd = crypto.randomBytes(16);
    return  'window.APP_SECRET = "' +
            crypto.createHash('md5').update(rnd).digest('hex') +
            '";';
  };

  return function (req, res) {
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
      var data, view;

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

      view = HashTree.get(nodeca.runtime.views, env.response.view);
      data = _.extend({}, static_helpers, env.response.data);

      if (!view) {
        res.statusCode = 500;
        res.end('View ' + env.response.view + ' not found');
        return;
      }

      // success render view
      res.end(view.en(data));
    }, env); // nodeca.filters.run
  };
}


////////////////////////////////////////////////////////////////////////////////


http.attach = function attach(server, next) {
  var app     = connect(),
      assets  = nodeca.runtime.assets,
      ROOT    = path.resolve(__dirname, '../../..');

  app.use("/",          fix_vhost(nodeca.config.listen));
  app.use("/download/", downloads_server(path.join(ROOT, 'public/download')));
  app.use("/assets/",   Mincer.createServer(assets.environment, assets.manifest));
  app.use("/",          static_server(path.join(ROOT, 'public/root')));
  app.use("/",          connect.query());
  app.use("/",          app_server());

  // connect application is an ordinary
  // HTTP(S) request event handler
  server.on('request', app);
  next();
};
