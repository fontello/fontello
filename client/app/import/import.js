'use strict';


var _     = require('lodash');
var async = require('async');


var KNOWN_FONT_IDS     = {};


// Fill in known fonts
_.each(require('../../../lib/embedded_fonts/configs'), function (o) {
  KNOWN_FONT_IDS[o.font.fontname] = o.id;
});


////////////////////////////////////////////////////////////////////////////////

//
// Import config
//
// str  - JSON data
// file - original file info
//
function import_config(str, file) {
  var config, session;

  try {
    config  = JSON.parse(str);
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
  } catch (e) {
    N.wire.emit('notify', t('error.bad_config_format', { name: file.name }));
  }
}

//
// Import zip. Try to determine content & call appropriate parsers
//
// str  - JSON data
// file - original file info
//
function import_zip(data, file) {
  try {
    var zip = new window.JSZip(data);

    // Try to search fontello config by known path
    // 'fontello-XXXXXX/config.json'. If exists - consider zip
    // as fontello archive & do config import.
    var search = zip.file(/fontello-[0-9a-f]+[\\/]config[.]json/);
    if ((search.length === 1) && (search[0].options.dir === false)) {
      import_config(search[0].data);
      return;
    }

    // If not fontello archive - scan it and try to import everything known
    _.each(zip.files, function(f) {
      // Currently show error for all entries
      N.wire.emit('notify', t('error.unknown_format', { name: f.name }));
    });
  } catch (e) {
    N.wire.emit('notify', t('error.bad_zip', { name: file.name }));
  }
}

// Handles change event of file input
//
function handleFileSelect(event) {
  event.stopPropagation();
  event.preventDefault();

  var files = [];

  // Extract files list
  if (event.dataTransfer && event.dataTransfer.files) {
    // Got files via mouse drop
    files = event.dataTransfer.files;
  } else if (event.target && event.target.files) {
    // Got files via dialog
    files = event.target.files;
  }

  if (files === []) {
    // Unexpected behavior. Should not happen in real life.
    N.wire.emit('notify', t('error.no_files_chosen'));
    return;
  }

  try {
    async.map(files,
      function (file, next) {
        var reader = new FileReader();

        // that's not needed, but should not be missed
        reader.onerror = next;
        reader.onabort = next;

        //
        // Try to detect file type, and call appropriate reader
        // and importer
        //

        // Chrome omits type on JSON files, so check it by extention
        if (file.name.match(/[.]json$/)) {
          reader.onload = function (e) {
            import_config(e.target.result, file);
            next();
          };
          reader.readAsText(file);
          return;
        }

        if (file.type === 'application/zip') {
          reader.onload = function (e) {
            import_zip(e.target.result, file);
            next();
          };
          // Don't use readAsBinaryString() for IE 10 compatibility
          reader.readAsArrayBuffer(file);
          return;
        }

        // Unknown format - show error
        N.wire.emit('notify', t('error.unknown_format', { name: file.name }));
        next();
      },
      // final callback
      function () {
        // we must "reset" value of input field, otherwise Chromium will
        // not fire change event if the same file will be chosen twice, e.g.
        // import file -> made changes -> import same file
        if (event.target && event.target.files) { $(event.target).val(''); }
      }
    );
  } catch (err) {
    N.wire.emit('notify', t('error.invalid_browser'));
  }
}


////////////////////////////////////////////////////////////////////////////////


N.wire.once('navigate.done', function () {

  //
  // Create regular files selector
  //

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
  $input.on('change', handleFileSelect);

  // handle settings menu click -> open file dialog
  N.wire.on('import.start', function () {
    $input.click();
  });

  //
  // Setup global drag & drop zone
  //


  var dropZone = $('body');

  // add the dataTransfer property for use with the native `drop` event
  // to capture information about files dropped into the browser window
  $.event.props.push("dataTransfer");

  dropZone.on('dragover', function (event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  });

  dropZone.on('drop', handleFileSelect);
});
