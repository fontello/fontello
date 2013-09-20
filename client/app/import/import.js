'use strict';


var _     = require('lodash');
var async = require('async');
var XMLDOMParser = require('xmldom').DOMParser;

function uid() {
  /*jshint bitwise: false*/
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
    return ((Math.random()*16)|0).toString(16);
  });
}

////////////////////////////////////////////////////////////////////////////////

//
// Import config
//
// str  - JSON data
// file - original file info
//
function import_config(str, file) {

  try {
    var config  = JSON.parse(str);
    var getFont = _.memoize(N.app.fontsList.getFont);

    N.app.fontName(config.name || '');
    N.app.cssPrefixText(String(config.css_prefix_text || 'icon-'));
    N.app.cssUseSuffix(config.css_use_suffix === true);
    N.app.hinting(config.hinting !== false);  // compatibility with old configs

    // reset selection prior to set glyph data
    _.each(N.app.fontsList.selectedGlyphs(), function (glyph) { glyph.selected(false); });

    // create map to lookup glyphs by id
    var glyphById = {};
    _.each(N.app.fontsList.fonts, function (font) {
      _.each(font.glyphs, function (glyph) {
        glyphById[glyph.uid] = glyph;
      });
    });

    _.each(config.glyphs, function (g) {

      if (!getFont(g.src)) { return; }

      var glyph = glyphById[g.uid];

      if (!glyph) { return; }

      glyph.selected(true);
      glyph.code(g.code || glyph.orig_code || glyph.originalCode);
      glyph.name(g.css || glyph.orig_css || glyph.originalName);
    });
  } catch (e) {
    N.wire.emit('notify', t('error.bad_config_format', { name: file.name }));
  }
}

//
// Import zip. Try to determine content & call appropriate parsers
//
// data - byte array with zipped content
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

function isSvgFont(data) {
  return (data.indexOf('<font') + 1);
}

function coordinateTransform(path) {
  return path;
}

//
// Import svg files. Try to determine content & call appropriate parsers
//
// data - text content
// file - original file info
//
function import_svg(data, file) {
  if (!isSvgFont(data)) {
    console.error(file.name + " does not contain fonts");
    return;
  }
  var customFont = _.find(N.app.fontsList.fonts, {isCustom: true});

  if (!customFont) {
    console.error("The custom font does not exist");
    return;
  }

  var xmlDoc = (new XMLDOMParser()).parseFromString(data, "application/xml");
  var svgGlyps = xmlDoc.getElementsByTagName('glyph');

  var maxRef = _.max(customFont.glyphs(), function(glyph) { // calculate charRef with max char code
    return glyph.charRef.charCodeAt(0);
  }).charRef;

  var charRefCode = (!maxRef) ? 0xe800 : maxRef.charCodeAt(0) + 1; // get next char code

  customFont.glyphs.valueWillMutate();

  _.each(svgGlyps, function (svgGlyph) {
    var d = _.find(svgGlyph.attributes, {name: 'd'}).value;

    customFont.glyphs.peek().push(
      new N.models.GlyphModel(customFont, {
        css:    (_.find(svgGlyph.attributes, {name: 'glyph-name'}).value || 'glyph'), // default name
        // FIXME replace with fixedFromCharCode
        code:   (_.find(svgGlyph.attributes, {name: 'unicode'}).value.charCodeAt(0) || 0),
        uid:    uid(),
        charRef:  charRefCode++,
        path:   coordinateTransform(d),
        width:  _.find(svgGlyph.attributes, {name: 'horiz-adv-x'}).value
      })
    );
  });

  customFont.glyphs.valueHasMutated();
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
        } else if (file.type === 'application/zip') {
          reader.onload = function (e) {
            import_zip(e.target.result, file);
            next();
          };
          // Don't use readAsBinaryString() for IE 10 compatibility
          reader.readAsArrayBuffer(file);
          return;
        }  else if (file.type === 'image/svg+xml') {
          reader.onload = function (e) {
            import_svg(e.target.result, file);
            next();
          };
          reader.readAsText(file);
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
  var dropProgress = false;

  // add the dataTransfer property for use with the native `drop` event
  // to capture information about files dropped into the browser window
  $.event.props.push("dataTransfer");

  dropZone.on('dragover', function (event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    if (!dropProgress) {
      dropZone.addClass('drop-progress');
      dropProgress = true;
    }
  });

  dropZone.on('dragleave', function () {
    dropZone.removeClass('drop-progress');
    dropProgress = false;
  });

  dropZone.on('drop', function (event) {
    dropZone.removeClass('drop-progress');
    dropProgress = false;
    handleFileSelect(event);
  });
});

//
// Setup import listener
//
N.wire.on('import.obj', function(obj) {
  import_config(JSON.stringify(obj), {});
});
