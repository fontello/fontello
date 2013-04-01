#!/usr/bin/env node


"use strict";


exports.root = __dirname;
exports.init = function (N) { require('./lib/hooks.js')(N); };


if (!module.parent) {
  require('./lib/system/runner').bootstrap(exports);
}
