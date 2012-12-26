#!/usr/bin/env node


"use strict";


require('./lib/runner').bootstrap(__dirname, {
  init: function (N, next) {
    require('./lib/io');
    next();
  }
});
