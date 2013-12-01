#!/usr/bin/env node


'use strict';


exports.root = __dirname;
exports.init = function (N) { require('./lib/autoload.js')(N); };


if (!module.parent) {
  require('./lib/system/runner').bootstrap(exports);
}
