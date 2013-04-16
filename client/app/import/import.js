'use strict';


var _ = require('lodash');


var KNOWN_FONT_IDS     = {};


// Fill in known fonts
_.each(require('../../../lib/embedded_fonts/configs'), function (o) {
  KNOWN_FONT_IDS[o.font.fontname] = o.id;
});


////////////////////////////////////////////////////////////////////////////////


function import_data(fileInfo) {
  var config, session;

  if ('application/json' !== fileInfo.type || !_.isObject(fileInfo.data)) {
    return;
  }

  config  = fileInfo.data;
  session = { fontname: config.name, fonts: {} };

  _.each(config.glyphs, function (g) {
    var id = KNOWN_FONT_IDS[g.src];

    if (!session.fonts[id]) {
      session.fonts[id] = { collapsed: false, glyphs: [] };
    }

    session.fonts[id].glyphs.push({
      selected:  true,
      uid:       g.uid,
      css:       g.css,
      code:      g.code,
      orig_css:  g.orig_css,
      orig_code: g.orig_code
    });
  });

  N.wire.emit('session_load', session);
}


// Handles change event of file input
//
function onFileChange(event) {
  var fileInfo, reader;

  try {
    fileInfo   = (event.target.files || [])[0];
    reader = new window.FileReader();

    // we must "reset" value of input field, otherwise Chromium will
    // not fire change event if the same file will be chosen twice, e.g.
    // import file -> made changes -> import same file
    $(event.target).val('');

    if (!fileInfo) {
      // Unexpected behavior. Should not happen in real life.
      N.wire.emit('notify', t('error.no_config_chosen'));
      return;
    }

    reader.onload = function (event) {
      var data = event.target.result
        , type = fileInfo.type;

      // Chromium omits type on JSON files, so if type is JSON, or
      // it's not specified, we are parsing data and set json type
      // on success
      if (!type || (/\/json$/).test(type)) {
        try {
          data = JSON.parse(data);
          type = 'application/json';
        } catch (err) {
          // do nothing
        }
      }

      import_data({ type: type, name: fileInfo.name, data: data });
    };

    reader.readAsBinaryString(fileInfo);
  } catch (err) {
    N.wire.emit('notify', t('error.invalid_browser'));
  }
}


////////////////////////////////////////////////////////////////////////////////


N.wire.once('navigate.done', function () {
  var $input = $('<input type="file">');

  // !!! WARNING !!!
  // Chrome does not triggers events, when element has "display: none"
  $input.css({
    visibility: 'hidden'
  , position:   'absolute'
  , left:       '-10000px'
  });

  // inject $el into body
  $input.appendTo('body');

  // listen input changes
  $input.on('change', onFileChange);

  // listen start import requests
  N.wire.on('import.start', function () {
    $input.click();
  });
});
