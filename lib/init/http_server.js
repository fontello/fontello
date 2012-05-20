"use strict";


/*global nodeca, _*/


// stdlib
var path = require('path');


// nodeca
var HashTree  = require('nlib').Support.HashTree;


// 3rd-party
var connect   = require('connect');
var socket_io = require('socket.io');
var Faye      = require('faye');


// HELPERS /////////////////////////////////////////////////////////////////////


// Amount of clients (browser tabs) online
var active_clients = 0;


// Dummy function
var noop = function () {};


function attach_connect_app(server) {
  var app = connect(), static_helpers = {};

  // fix hostname
  app.use(function (req, res, next) {
    var host = (req.headers.host || '').split(':')[0];

     // if no host in config - then we accept any host
    if (!nodeca.config.listen.host) {
      next();
      return;
    }

    // known hostname
    if (host === nodeca.config.listen.host) {
      next();
      return;
    }

    // fix hostname by redirect
    host = nodeca.config.listen.host;
    if (nodeca.config.listen.port && 80 !== nodeca.config.listen.port) {
      host += ':' + nodeca.config.listen.port;
    }

    res.writeHead(301, {'Location': "http://" + host});
    res.end();
  });


  app.use("/assets/", nodeca.runtime.assets_server);

  // init downloads static middleware
  (function (options) {
    var FINGERPRINT_RE = /-([0-9a-f]{32,40})\.[^.]+$/;
    app.use("/download/", function (req, res, next) {
      var match = FINGERPRINT_RE.exec(req.url), filename;

      options.path    = req.url;
      options.getOnly = true;

      if (match) {
        // beautify zipball name
        filename = 'filename=fontello-' + match[1].substr(0, 8) + '.zip';
        res.setHeader('Content-Disposition', 'attachment; ' + filename);
      }

      connect.static.send(req, res, next, options);
    });
  }({root: path.resolve(__dirname, '../../public/download')}));

  // init dummy static server
  (function (options) {
    var static_urls = ['/favicon.ico', '/robots.txt', '/snippet.png'];

    app.use("/", function (req, res, next) {
      if (-1 === static_urls.indexOf(req.url)) {
        next();
        return;
      }

      options.path    = req.url;
      options.getOnly = true;

      connect.static.send(req, res, next, options);
    });
  }({root: path.resolve(__dirname, '../../public/root')}));

  // middlewares
  app.use(connect.query());


  static_helpers.asset_path = function (path) {
    var asset = nodeca.runtime.assets_mincer.findAsset(path);
    return !asset ? "#" : ("/assets/" + asset.digestPath);
  };

  static_helpers.config = function (part) {
    return !part ? nodeca.config : HashTree.get(nodeca.config, part);
  };

  static_helpers.count_online_users = function () {
    return active_clients + 1;
  };


  // main worker
  app.use(function (req, res) {
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
  });

  // connect application is a simple HTTP(S) request event handler
  server.on('request', app);
}


//
// Socket.IO
//


function attach_socket_io(server) {
  var noop = function () {}, sio;

  sio = nodeca.runtime.sio = socket_io.listen(server);

  var curr_users_count;
  setInterval(function () {
    var updated_count = sio.sockets.clients().length;
    if (updated_count !== curr_users_count) {
      curr_users_count = updated_count;
      sio.sockets.emit('users_online', curr_users_count);
    }
  }, 10000);

  if ('development' !== nodeca.runtime.env) {
    sio.enable('browser client minification');  // send minified client
    sio.enable('browser client etag');          // apply etag caching logic based on version number
    sio.enable('browser client gzip');          // gzip the file
    sio.set('log level', 1);                    // reduce logging
  }

  sio.sockets.on('connection', function (socket) {
    socket.on('server', function (msg, cb) {
      var env, fn = HashTree.get(nodeca.server, msg.method);

      if (msg.version !== nodeca.runtime.version) {
        (cb || noop)({
          version:  nodeca.runtime.version,
          error:    'Nodeca client mismatch'
        });
        return;
      }

      if (!fn) {
        (cb || noop)({
          version:  nodeca.runtime.version,
          error:    'Unknown server method: ' + msg.method
        });
        return;
      }

      // prefill environment
      env = {
        __raw__: {
          socket: socket
        },
        request: {
          origin: 'RT',
          method: msg.method,
          namespace: msg.method.split('.').shift()
        },
        session: {
          // FIXME: use req.session instead
          theme: 'desktop',
          lang: nodeca.config.locales.default
        },
        response: {
          data: {},
          layout: 'default',
          view: msg.method
        }
      };

      nodeca.filters.run(msg.method, msg.params, fn, function (err) {
        if (err) {
          nodeca.logger.error(err.stack || err.toString());
        }

        (cb || noop)({
          version:  nodeca.runtime.version,
          error:    (err ? err.toString() : null),
          result:   env.response
        });
      }, env);
    });
  });
}


//
// Faye
//


function handle_rpc(msg, cb) {
  var env, fn = HashTree.get(nodeca.server, msg.method);

  if (msg.version !== nodeca.runtime.version) {
    (cb || noop)({
      version:  nodeca.runtime.version,
      error:    'Nodeca client mismatch'
    });
    return;
  }

  if (!fn) {
    (cb || noop)({
      version:  nodeca.runtime.version,
      error:    'Unknown server method: ' + msg.method
    });
    return;
  }

  // prefill environment
  env = {
    request: {
      origin: 'RT',
      method: msg.method,
      namespace: msg.method.split('.').shift()
    },
    session: {
      // FIXME: use req.session instead
      theme: 'desktop',
      lang: nodeca.config.locales.default
    },
    response: {
      data: {},
      layout: 'default',
      view: msg.method
    }
  };

  nodeca.filters.run(msg.method, msg.params, fn, function (err) {
    if (err) {
      nodeca.logger.error(err.stack || err.toString());
    }

    (cb || noop)({
      version:  nodeca.runtime.version,
      error:    (err ? err.toString() : null),
      result:   env.response
    });
  }, env);
}


function attach_faye(server) {
  var faye = new Faye.NodeAdapter({mount: '/faye', timeout: 45});


  // FIXME: Replace dummy active_clients inc/dec with real heartbeat/timeouts
  faye.bind('handshake',  function () { active_clients++; });
  faye.bind('disconnect', function () { active_clients--; });


  var curr_users_count = 0;
  setInterval(function () {
    if (active_clients !== curr_users_count) {
      curr_users_count = active_clients;
      faye.getClient().publish('/stats/users_online', curr_users_count);
    }
  }, 10000);


  // subscribe handler
  faye.bind('handshake', function (clientId) {
    var channel = '/rpc-' + clientId;
    faye.getClient().subscribe(channel + '-req', function (data) {
      handle_rpc(data.msg, function (msg) {
        faye.getClient().publish(channel, {id: data.id, msg: msg});
      });
    });
  });

  // client gone - unsubscribe
  faye.bind('disconnect', function (clientId) {
    faye.getClient().unsubscribe('/rpc-' + clientId + '-req');
  });

  faye.attach(server);
}


//
// Server KickStarter
//


function start_server(next) {
  var server, host, port, err_handler;

  // create server
  host    = nodeca.config.listen.host || 'localhost';
  port    = nodeca.config.listen.port || 3000;
  server  = require('http').createServer();

  err_handler = function (err) {
    var err_prefix = "Can't bind to <" + host + "> with port <" + port + ">: ";

    if ('EADDRINUSE' === err.code) {
      next(err_prefix + 'Address in use...');
      return;
    }

    if ('EADDRNOTAVAIL' === err.code) {
      // system has no such ip address
      next(err_prefix + 'Address is not available...');
      return;
    }

    if ('ENOENT' === err.code) {
      // failed resolve hostname to ip address
      next(err_prefix + "Failed to resolve IP address...");
      return;
    }

    // unexpected / unknown error
    next(err_prefix + err);
  };

  server.on('error', err_handler);

  // start server
  server.listen(port, host, function () {
    server.removeListener('error', err_handler);
    next(null, server);
  });
}


// MODULE EXPORTS //////////////////////////////////////////////////////////////


module.exports = function (next) {
  start_server(function (err, server) {
    if (err) {
      next(err);
      return;
    }

    attach_connect_app(server);
    attach_faye(server);

    next();
  });
};
