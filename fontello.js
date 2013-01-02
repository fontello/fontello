#!/usr/bin/env node


"use strict";


var run = module.exports = function run(args, callback) {
  require('./lib/runner').bootstrap(__dirname, args, callback);
};


if (!module.parent) {
  run();
}
