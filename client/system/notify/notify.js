'use strict';


var _ = require('lodash');


N.wire.on('notify', function notify(options) {
  var msg = options;

  if (_.isString(options)) {
    msg = { type: 'error', text: options }
  }

  $.noty($.extend({ layout: 'topRight', theme: 'noty_theme_twitter' }, msg));
});
