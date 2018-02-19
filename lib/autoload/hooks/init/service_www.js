// Initializes (start) HTTP and RPC server listeners.
//
// Emits sub events `init:server.https` and `init:server.http`
//

'use strict';


const _           = require('lodash');
const cluster     = require('cluster');
const fs          = require('fs');
const http        = require('http');
const https       = require('https');
const os          = require('os');
const path        = require('path');
const url         = require('url');
const env         = require('../../../system/env');
const WorkerPool  = require('../../../system/worker_pool');


////////////////////////////////////////////////////////////////////////////////
// Parse binding config and returns a parsed map:
//
//  {
//    '127.0.0.1:3000': {
//      address: '127.0.0.1',
//      port:    3000,
//      ssl:     null,
//      hosts:  [ 'localhost', ... ]
//    },
//    // ...
//  }
//
function extractBindings(config, mainApp, logger) {
  let result = {};

  // Collect non-SSL bindings.
  _.forEach(config, options => {
    if (!result[options.listen]) {
      result[options.listen] = {
        address:   options.listen.address,
        port:      options.listen.port,
        forwarded: options.forwarded,
        hosts:     [],
        ssl:       null
      };
    }
  });

  // Collect SSL bindings.
  _.forEach(config, options => {

    if (!options.ssl) return;

    if (!result[options.ssl.listen]) {
      result[options.ssl.listen] = {
        address:   options.ssl.listen.address,
        port:      options.ssl.listen.port,
        forwarded: options.ssl.forwarded,
        hosts:     [],
        ssl:       _.omit(options.ssl, 'listen')
      };

      // Read files.
      [ 'key', 'cert' ].forEach(val => {
        if (!options.ssl[val]) return;

        let filename = path.resolve(mainApp.root, options.ssl[val]);

        try {
          result[options.ssl.listen].ssl[val] = fs.readFileSync(filename, 'utf8');
        } catch (err) {
          logger.error(`Can't read ${val}-file from SSL config (${filename}): ${err}`);
        }
      });
    }
  });

  // Fill-in host lists that should be served by <address:port>
  _.forEach(config, options => {
    let host = url.parse(options.mount, false, true).host || '*';

    // For non-SSL.
    if (result[options.listen].hosts.indexOf(host) < 0) {
      result[options.listen].hosts.push(host);
    }

    // For SSL.
    if (options.ssl && result[options.ssl.listen].hosts.indexOf(host) < 0) {
      result[options.ssl.listen].hosts.push(host);
    }
  });

  return result;
}


// Returns protocol name of `req` request object.
// If `isForwarded` is true, it will respect X-Forwarded-* headers used when
// Nodeca is behind a proxy.
//
function getRequestProtocol(req, isForwarded) {
  if (!isForwarded) return req.connection.encrypted ? 'https' : 'http';

  if (req.headers['x-forwarded-ssl'] === 'on') return 'https';

  if (req.headers['x-forwarded-scheme']) {
    return req.headers['x-forwarded-scheme'];
  }

  if (req.headers['x-forwarded-proto']) {
    return req.headers['x-forwarded-proto'].split(/\s*,\s*/)[0];
  }

  return req.connection.encrypted ? 'https' : 'http';
}


// Returns remote IP address of `req` request object.
// If `isForwarded` is true, it will respect `X-Real-IP` and `X-Forwarded-For`
// header (when Nodeca is behind a proxy).
//
function getRequestRemoteAddress(req, isForwarded) {
  if (!isForwarded) return req.connection.remoteAddress;

  if (req.headers['x-real-ip']) return req.headers['x-real-ip'];

  if (req.headers['x-forwarded-for']) {
    // X-Forwarded-For can contain chain of proxies.
    return req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
  }

  return req.connection.remoteAddress;
}


module.exports = function (N) {
  ////////////////////////////////////////////////////////////////////////////////
  // Start http worker pool
  //
  // In cluster mode it forks N http workers, in single mode it emits
  // `init:server.www` instead
  //
  let active_pools = [];

  N.wire.on('init:services', { parallel: true }, async function worker_pool_http_init(N) {
    let fork = (N.config.fork || {}).www;

    if (fork === 'auto') {
      fork = os.cpus().length;
    } else {
      fork = +fork || 0;
    }

    if (!cluster.isMaster || fork < 1) {
      // single process mode
      await N.wire.emit('init:services.www', N);
      return;
    }

    let pool = new WorkerPool('www', fork);

    active_pools.push(pool);

    pool.on('worker:spawn',  pid         => N.logger.info(`Worker ${pid} spawned`));
    pool.on('worker:error',  error       => N.logger.error(error));
    pool.on('worker:online', pid         => N.logger.info(`Worker ${pid} is running`));
    pool.on('worker:exit',   (pid, code) => N.logger.info(`Worker ${pid} exited with status ${code}`));

    N.wire.on('exit.shutdown', { ensure: true, parallel: true }, function shutdown_http_pool() {
      pool.shutdown();

      return new Promise(resolve => pool.once('exit', resolve));
    });

    N.wire.on('exit.terminate', { ensure: true, parallel: true }, function terminate_http_pool() {
      pool.terminate();

      return new Promise(resolve => pool.once('exit', resolve));
    });

    N.wire.on('reload', function reload_http_pool() {
      pool.reload();
    });

    await new Promise((resolve, reject) => {
      // Wait for either 'online' or 'error' events,
      // whichever comes first
      //
      let on_error, on_online;

      on_online = function () {
        pool.removeListener('online', on_online);
        pool.removeListener('error', on_error);

        resolve();
      };

      on_error = function (error) {
        pool.removeListener('online', on_online);
        pool.removeListener('error', on_error);

        reject(error);
      };

      pool.on('online', on_online);
      pool.on('error',  on_error);
    });

    N.logger.info('Http workers started successfully');
  });


  N.wire.on('init:services.list', function worker_pool_http_list(data) {
    for (let pool of active_pools) data.push(pool);
  });


  ////////////////////////////////////////////////////////////////////////////////
  // Start http(s) server(s) and attach application listener to it
  //
  var servers = [];

  function createListener(options) {
    // Create host validation function
    let host_is_valid;

    if (options.hosts.indexOf('*') !== -1) {
      // if binding address:port has *any host* mount point,
      // skip host validation
      host_is_valid = () => true;
    } else {
      host_is_valid = host => options.hosts.indexOf(host) !== -1;
    }

    return function (req, res) {
      let isEncrypted,
          parsedUrl,
          fullUrl,
          type,
          routeMatch,
          remoteAddress;

      remoteAddress = getRequestRemoteAddress(req, options.forwarded);

      // Abort if connection is closed before we received the request,
      // this should never happen, but we added this check just in case.
      if (req.connection.destroyed || !remoteAddress) return;

      if (_.isEmpty(req.headers.host)) {
        // Host header is not set or empty.
        res.writeHead(N.io.BAD_REQUEST, { 'Content-Type': 'text/plain' });
        res.end(`[${N.io.BAD_REQUEST}] Bad Request: missed 'Host' header`);
        return;
      }

      // Frontend server may handle HTTPS request from the client
      // but connect with us via plain HTTP. So, detect protocol.
      let protocol = getRequestProtocol(req, options.forwarded);

      isEncrypted = protocol === 'https';

      if (!host_is_valid(req.headers.host)) {
        // Host is unknown.
        N.wire.emit('!sys.error.host_invalid', { req, res, isEncrypted })
          .then(() => {
            if (res.finished) {
              return;
            }

            // Show default error message if handler doesn't close response
            res.writeHead(N.io.NOT_FOUND, { 'Content-Type': 'text/plain' });
            res.end(`Invalid host ${req.headers.host}`);
          })
          .catch(err => N.logger.fatal(err));

        return;
      }

      parsedUrl = url.parse(req.url);
      fullUrl   = protocol + '://' + req.headers.host + parsedUrl.path;

      //
      // Choose a responder to use.
      //

      if (parsedUrl.pathname === '/io/rpc') {
        type = 'rpc';
      } else {
        type = 'http';

        let httpMethod   = req.method.toLowerCase();

        routeMatch = _.find(N.router.matchAll(fullUrl),
                            match => _.has(match.meta.methods, httpMethod));

        if (routeMatch) {
          type = routeMatch.meta.responder;
          routeMatch.params = routeMatch.params || {};
        }
      }

      //
      // Try to process request: create environment & run responder chain
      // Responders are totally pluggable, via hooks
      //

      let _env = env(N, {
        req,
        res,
        type,
        isEncrypted,
        matched: routeMatch,
        remoteAddress
      });

      N.wire.emit('responder:' + type, _env)
        .catch(err => N.logger.fatal(err));
    };
  }


  N.wire.on('init:services.www', async function server_bind(N) {
    let bindings = extractBindings(N.config.bind, N.mainApp, N.logger);
    let bindingNames = _.keys(bindings);

    function bindServer(name) {

      return new Promise((resolve, reject) => {
        let options = bindings[name],
            address = options.address,
            port    = options.port,
            server;

        setTimeout(function () {
          reject(`Failed to bind '${name}' (timed out)`);
        }, 3000);

        server = options.ssl ? https.createServer(options.ssl) : http.createServer();

        //
        // attach event handlers
        //

        server.on('error', function handle_startup_error(err) {
          let err_prefix = `Can't bind to <${address}> with port <${port}>: `;

          switch (err.code) {
            case 'EADDRINUSE':
              reject(err_prefix + 'Address in use...');
              return;

            case 'EADDRNOTAVAIL':
              reject(err_prefix + 'Address is not available...');
              return;

            case 'ENOENT':
              reject(err_prefix + 'Failed to resolve IP address...');
              return;
          }

          // unknown error
          reject(err_prefix + err);
        });


        server.on('connection', socket => {
          socket.setNoDelay();
        });


        server.on('request', createListener(options));


        server.on('listening', () => {
          // remove error and listening handlers,
          // once we successfully bounded on address:port
          server.removeAllListeners('error');
          server.removeAllListeners('listening');

          // Notify that we started listening
          N.logger.info(`Listening on ${address}:${port} ` + (options.ssl ? 'SSL' : 'NON-SSL'));

          // Successfully binded!
          resolve();
        });

        servers.push(server);

        // Emit sub event and try to bind to the port after that.
        N.wire.emit(options.ssl ? 'init:server.https' : 'init:server.http', server)
          .then(() => { server.listen(port, address); })
          .catch(reject);
      });
    }

    // Bind web servers
    for (let i = 0; i < bindingNames.length; i++) {
      await bindServer(bindingNames[i]);
    }
  });

  N.wire.on('exit.shutdown', { ensure: true, parallel: true }, function close_http_server() {
    let promises = servers.map(server => new Promise(resolve => {
      setTimeout(() => resolve(), 10000);
      server.close(resolve);
    }));

    if (N.live) N.live.emit('common.core.reconnect');

    return Promise.all(promises);
  });
};
