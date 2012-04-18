#!/usr/bin/env node

/*global nodeca*/

"use strict";


// nodeca
var NLib = require('nlib');


var app = NLib.Application.create({
  name: 'fontomas',
  root: __dirname
});


// preset nodeca version
nodeca.hooks.init.before('bundles', function (next) {
  nodeca.runtime.version = require('./package.json').version;
  next();
});


nodeca.hooks.init.after('bundles',        require('./lib/init/http_assets'));
nodeca.hooks.init.after('init-complete',  require('./lib/init/http_server'));


app.run();
