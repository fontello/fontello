'use strict';


N.wire.on('notify', function notify(options) {
  $.noty($.extend({ layout: 'topRight', theme: 'noty_theme_twitter' }, options));
});
