#!/usr/bin/env node

/*global nodeca*/

"use strict";


// nodeca
var NLib = require('nlib');


var app = NLib.Application.create({
  name: 'fontomas',
  root: __dirname
});


nodeca.hooks.init.after('bundles',        require('./lib/init/assets_server'));
nodeca.hooks.init.after('init-complete',  require('./lib/init/http_server'));


app.run();
