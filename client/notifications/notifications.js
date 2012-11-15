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


nodeca.events.once('page:loaded', function () {
  nodeca.events.on('notification', notify);
});


////////////////////////////////////////////////////////////////////////////////


module.exports = notify;
