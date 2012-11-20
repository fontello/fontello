/*global N, _, $, Modernizr, Backbone, window, Faye*/


"use strict";


N.once('page:loaded', function () {
  $(function () {
    // check browser's capabilities
    if (!Modernizr.fontface) {
      N.logger.error("bad browser");

      $(N.render('app.bad_browser')).modal({
        backdrop: 'static',
        keyboard: false
      });

      return;
    }
  });
});
