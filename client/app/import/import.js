'use strict';


var _       = require('lodash');
var async   = require('async');
var XMLDOMParser = require('xmldom').DOMParser;
var SvgPath = require('svgpath');

var utils   = require('../../_lib/utils');


// path functions borrowed from node.js `path`
// https://github.com/joyent/node/blob/master/lib/path.js

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
function splitPath(filename) {
  return splitPathRe.exec(filename).slice(1);
}
function basename(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
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
    var getFont = _.memoize(function(name) { return N.app.fontsList.getFont(name); });
    var customIcons = getFont('custom_icons');
    var maxRef = _.max(customIcons.glyphs(), function(glyph) {
      return utils.fixedCharCodeAt(glyph.charRef);
    }).charRef;

    var allocatedRefCode = (!maxRef) ? 0xe800 : utils.fixedCharCodeAt(maxRef) + 1;

    N.app.fontName(config.name || '');
    N.app.cssPrefixText(String(config.css_prefix_text || 'icon-'));
    N.app.cssUseSuffix(config.css_use_suffix === true);
    N.app.hinting(config.hinting !== false);  // compatibility with old configs

    N.app.fontUnitsPerEm(Number(config.units_per_em) || 1000);
    N.app.fontAscent(Number(config.ascent) || 850);

    // Patch broken data to fix original config
    if (config.fullname === 'undefined') { delete config.fullname; }
    if (config.copyright === 'undefined') { delete config.copyright; }

    N.app.fontFullName(String(config.fullname || ''));
    N.app.fontCopyright(String(config.copyright || ''));

    // reset selection prior to set glyph data
    N.app.fontsList.unselectAll();

    // remove custom glyphs
    customIcons.removeGlyph();

    // create map to lookup glyphs by id
    var glyphById = {};
    _.each(N.app.fontsList.fonts, function (font) {
      _.each(font.glyphs(), function (glyph) {
        glyphById[glyph.uid] = glyph;
      });
    });

    _.each(config.glyphs, function (g) {

      if (!getFont(g.src)) { return; }

      if ( g.src === 'custom_icons') {
        customIcons.addGlyph({
          uid:      g.uid,
          css:      g.css,
          code:     g.code,
          charRef:  allocatedRefCode++,
          selected: g.selected,
          search:   g.search || [],
          svg: {
            path:    g.svg.path,
            width:   g.svg.width
          }
        });
        return;
      }

      var glyph = glyphById[g.uid];

      if (!glyph) { return; }

      glyph.selected(true);
      glyph.code(g.code || glyph.originalCode);
      glyph.name(g.css || glyph.originalName);
    });
  } catch (e) {
    N.wire.emit('notify', t('err_bad_config_format', { name: file.name }));
    console.log(e);
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
      N.wire.emit('notify', t('err_unknown_format', { name: f.name }));
    });
  } catch (e) {
    N.wire.emit('notify', t('err_bad_zip', { name: file.name }));
  }
}

//
// Import svg fonts from svg files.
//
// data - text content
//

function import_svg_font(data/*, file*/) {
  var xmlDoc = (new XMLDOMParser()).parseFromString(data, 'application/xml');

  var customIcons = N.app.fontsList.getFont('custom_icons');

  // Allocate reference code, used to show generated font on fontello page
  // That's for internal needs, don't confuse with glyph (model) code
  var maxRef = _.max(customIcons.glyphs(), function(glyph) {
    return utils.fixedCharCodeAt(glyph.charRef);
  }).charRef;

  var allocatedRefCode = (!maxRef) ? 0xe800 : utils.fixedCharCodeAt(maxRef) + 1;

  var svgFont = xmlDoc.getElementsByTagName('font')[0];
  var svgFontface = xmlDoc.getElementsByTagName('font-face')[0];
  var svgGlyps = xmlDoc.getElementsByTagName('glyph');

  var fontHorizAdvX = svgFont.getAttribute('horiz-adv-x');
  var fontAscent = svgFontface.getAttribute('ascent');
  var fontUnitsPerEm = svgFontface.getAttribute('units-per-em') || 1000;

  var scale = 1000 / fontUnitsPerEm;

  _.each(svgGlyps, function (svgGlyph) {
    var d = svgGlyph.getAttribute('d');

    // FIXME
    // Now just ignore glyphs without image, however
    // that can be space. Does anyone needs it?
    if (!d) { return; }


    var glyphCodeAsChar = svgGlyph.getAttribute('unicode');

    var glyphCode = glyphCodeAsChar ? utils.fixedCharCodeAt(glyphCodeAsChar) : 0xE800;
    var glyphName = svgGlyph.getAttribute('glyph-name') || 'glyph';
    var glyphHorizAdvX =  svgGlyph.hasAttribute('horiz-adv-x') ? svgGlyph.getAttribute('horiz-adv-x') : fontHorizAdvX;

    if (!glyphHorizAdvX) { return; } // ignore zero-width glyphs

    var width = glyphHorizAdvX * scale;

    // Translate font coonds to single SVG image coords
    d = new SvgPath(d)
              .translate(0, -fontAscent)
              .scale(scale, -scale)
              .abs()
              .round(1)
              .toString();

    customIcons.addGlyph({
      css:     glyphName,
      code:    glyphCode,
      charRef: allocatedRefCode++,
      search:  [glyphName],
      svg: {
        path:  d,
        width: width
      }
    });
  });
}

//
// Import svg image from svg files.
//
// data - text content
//

function import_svg_image(data, file) {
  var xmlDoc = (new XMLDOMParser()).parseFromString(data, 'application/xml');

  var customIcons = N.app.fontsList.getFont('custom_icons');

  // Allocate reference code, used to show generated font on fontello page
  // That's for internal needs, don't confuse with glyph (model) code
  var maxRef = _.max(customIcons.glyphs(), function(glyph) {
    return utils.fixedCharCodeAt(glyph.charRef);
  }).charRef;

  var allocatedRefCode = (!maxRef) ? 0xe800 : utils.fixedCharCodeAt(maxRef) + 1;
  var svgTag = xmlDoc.getElementsByTagName('svg')[0];
  var pathTags = xmlDoc.getElementsByTagName('path');

  if (pathTags.length !== 1) {
    N.wire.emit('notify', t('err_bad_svg_image', { name: file.name }));
  }

  var d = pathTags[0].getAttribute('d');

  // getting viewBox values array
  var viewBox = _.map(
    (svgTag.getAttribute('viewBox') || '').split(' '),
    function(val) { return parseInt(val, 10); }
  );

  // getting base parameters

  var attr = {};

  _.forEach(['x', 'y', 'width', 'height'], function(key) {
    attr[key] = parseInt(svgTag.getAttribute(key), 10);
  });

  var x      = viewBox[0] || attr.x || 0;
  var y      = viewBox[1] || attr.y || 0;
  var width  = viewBox[2] || attr.width;
  var height = viewBox[3] || attr.height;

  // Scale to standard grid
  var scale  = 1000 / height;
  d = new SvgPath(d)
            .translate(-x, -y)
            .scale(scale)
            .abs()
            .round(1)
            .toString();
  width = Math.round(width * scale); // new width

  var glyphName = basename(file.name.toLowerCase(), '.svg').replace(/\s/g, '-');

  customIcons.addGlyph({
    css:      glyphName,
    code:     allocatedRefCode,
    charRef:  allocatedRefCode++,
    search:   [glyphName],
    svg: {
      path:   d,
      width:  width
    }
  });
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
    N.wire.emit('notify', t('err_no_files_chosen'));
    return;
  }

  N.app.fontsList.lock();

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

        if (file.name.match(/[.](woff|ttf|otf)$/i)) {
          N.wire.emit('notify', t('err_need_svg_font', { name: file.name }));
          next();
          return;
        }

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

            if ((e.target.result.indexOf('<font') + 1)) {
              import_svg_font(e.target.result, file);
            } else {
              import_svg_image(e.target.result, file);
            }
            next();
          };

          reader.readAsText(file);
          return;
        }

        // Unknown format - show error
        N.wire.emit('notify', t('err_unknown_format', { name: file.name }));
        next();
      },
      // final callback
      function () {
        N.app.fontsList.unlock();
        // we must "reset" value of input field, otherwise Chromium will
        // not fire change event if the same file will be chosen twice, e.g.
        // import file -> made changes -> import same file
        if (event.target && event.target.files) { $(event.target).val(''); }
      }
    );
  } catch (err) {
    N.wire.emit('notify', t('err_invalid_browser'));
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
  var dropTimer;

  // add the dataTransfer property for use with the native `drop` event
  // to capture information about files dropped into the browser window
  $.event.props.push('dataTransfer');

  dropZone.on('dragenter dragover', function (event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.

    clearTimeout(dropTimer);

    if (!dropProgress) {
      dropZone.addClass('drop-progress');
      dropProgress = true;
    }
  });

  dropZone.on('dragleave', function () {
    // !!! we can get `dragleave` events from child elements
    // http://stackoverflow.com/questions/7110353/html5-dragleave-fired-when-hovering-a-child-element
    // http://stackoverflow.com/questions/10867506/dragleave-of-parent-element-fires-when-dragging-over-children-elements

    // Do trottling to filter events
    clearTimeout(dropTimer);
    dropTimer = setTimeout(function () {
      dropZone.removeClass('drop-progress');
      dropProgress = false;
    }, 100);
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
