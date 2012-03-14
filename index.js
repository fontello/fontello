// stdlib
var Fs = require('fs');

// nodeca
var NLib = require('nlib');

// 3rd-party
var StaticLulz = require('static-lulz');
var FsTools = NLib.Vendor.FsTools;
var Async = NLib.Vendor.Async;


var app = NLib.Application.create({
  name: 'fontomas',
  root: __dirname
});


nodeca.hooks.init.after('bundles', function (next) {
  nodeca.runtime.assets_server = new StaticLulz();

  FsTools.walk(nodeca.runtime.assets_path, function (file, stats, next_file) {
    // Fill in Static lulz with files and data
    Async.waterfall([
      Async.apply(Fs.readFile, file),
      function (buffer, callback) {
        var rel_path = file.replace(nodeca.runtime.assets_path, '');
        nodeca.runtime.assets_server.add(rel_path, buffer);
        callback();
      }
    ], next_file);
  }, next);
});


function find_view(scope, api_path) {
  var parts = api_path.split('.');

  while (scope && parts.length) {
    scope = scope[parts.shift()];
  }

  return scope;
}


nodeca.hooks.init.after('init-complete', function (next) {
  var connect = require('connect'), fontomas = connect(), default_host;

  default_host = nodeca.config.listen.host;
  if (nodeca.config.listen.port && 80 !== +nodeca.config.listen.port) {
    default_host += ':' + nodeca.config.listen.port;
  }

  fontomas.use("/static/", nodeca.runtime.assets_server.middleware);
  fontomas.use(function (req, res) {
    var host = req.headers.host || default_host, env, match;

    // remove port part if it's 80
    if (host && '80' === host.split(':')[1]) {
      host = host.split(':')[0];
    }

    match = nodeca.runtime.router.match('//' + host + req.url.split('?').shift());

    if (!match) {
      // TODO: Fix not found handling
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    env = {
      err:    {code: null, message: null},
      data:   null,
      view:   match.meta.name
    };

    nodeca.filters.run(match.meta.name, match.params, match.meta.func, function (err) {
      var data, view;

      if (err && err.redirect) {
        res.statusCode = err.redirect[0];
        res.setHeader('Location', err.redirect[1]);
        res.end();
        return;
      } else if (err) {
        res.statusCode = 500;
        res.end(err.toString());
        return;
      }

      view = find_view(nodeca.runtime.views, env.view);
      data = env.data || {};

      if (!view) {
        // TODO: Fix view not found handling
        res.statusCode = 500;
        res.end('View ' + env.view + ' not found');
        return;
      }

      res.end(view.en(data));
    }, env); // nodeca.filters.run
  });

  nodeca.runtime.fontomas_http = fontomas;
  next();
});


// start application
app.run(function (err) {
  var server;

  if (err) {
    console.error(err);
    process.exit(1);
  }

  server = require('http').createServer(nodeca.runtime.fontomas_http);
  server.listen(nodeca.config.listen.port, nodeca.config.listen.host);
});
