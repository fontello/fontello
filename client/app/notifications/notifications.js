'use strict';


/*global $*/


module.exports.init = function (window, N) {
  N.on('notification', function notify(type, options, message) {
    if (!message) {
      message = options;
      options = {};
    }

    $.noty($.extend({layout: 'topRight'}, options, {
      type:   type,
      text:   message,
      theme:  'noty_theme_twitter'
    }));
  });
};
