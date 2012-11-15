'use strict';


/*global $, _, nodeca*/


////////////////////////////////////////////////////////////////////////////////


function notify(type, options, message) {
  if (!message) {
    message = options;
    options = {};
  }

  $.noty(_.extend({layout: 'topRight'}, options, {
    type:   type,
    text:   message,
    theme:  'noty_theme_twitter'
  }));
}


////////////////////////////////////////////////////////////////////////////////


nodeca.once('page:loaded', function () {
  nodeca.on('notification', notify);
});


////////////////////////////////////////////////////////////////////////////////


module.exports = notify;
