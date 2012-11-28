'use strict';


/*global $, N*/


module.exports.init = function () {
  N.on('notify', function notify(type, options, message) {
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
