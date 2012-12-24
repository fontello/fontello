#!/usr/bin/env node


"use strict";


require('./lib/runner').bootstrap(__dirname, {
  init: function () {
    require('./lib/io');
    require('./lib/filters');
  }
}).run();
