/*global N, _, $, Modernizr, Backbone, window, Faye*/


"use strict";


var render = require('../../../lib/render/client');


N.once('page:loaded', function () {
  $(function () {
    // check browser's capabilities
    if (!Modernizr.fontface) {
      N.logger.error("bad browser");

      $(render('app.bad_browser')).modal({
        backdrop: 'static',
        keyboard: false
      });

      return;
    }
  });
});
