#!/usr/bin/env node


'use strict';

var fs        = require('fs');
var path      = require('path');
var _         = require('lodash');
var yaml      = require('js-yaml');
var fstools   = require('fs-tools');
var async     = require('async');
var execFile  = require('child_process').execFile;
var domparser      = require('xmldom').DOMParser;
var ArgumentParser = require('argparse').ArgumentParser;


var svgImageTemplate = _.template(
    '<svg height="<%= height %>" width="<%= width %>" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="<%= d %>"<% if (transform) { %> transform="<%= transform %>"<% } %>/>' +
    '</svg>'
  );

var svgFontTemplate = _.template(
    '<?xml version="1.0" standalone="no"?>\n' +
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
    '<svg xmlns="http://www.w3.org/2000/svg">\n' +
    '<metadata><%= metadata %></metadata>\n' +
    '<defs>\n' +
    '<font id="<%= font.fontname %>" horiz-adv-x="<%= fontHeight %>" >\n' +

    '<font-face' +
      ' font-family="font.familyname"' +
      ' font-weight="400"' +
      ' font-stretch="normal"' +
      ' units-per-em="<%= fontHeight %>"' +
      //panose-1="2 0 5 3 0 0 0 0 0 0"
      ' ascent="<%= font.ascent %>"' +
      ' descent="<%= font.descent %>"' +
      //bbox="-1.33333 -150.333 1296 850"
      //underline-thickness="50"
      //underline-position="-100"
      //unicode-range="U+002B-1F6AB"
    ' />\n' +

    '<missing-glyph horiz-adv-x="<%= fontHeight %>" />\n' +

    '<% _.forEach(glyphs, function(glyph) { %>' +
      '<glyph' +
        ' glyph-name="<%= glyph.css %>"' +
        ' unicode="<%= glyph.unicode %>"' +
        ' d="<%= glyph.d %>"' +
        ' horiz-adv-x="<%= glyph.width %>"' +
      ' />\n' +
    '<% }); %>' +

    '</font>\n' +
    '</defs>\n' +
    '</svg>'
  );


function parseSvgImage(data, filename) {

  var doc = (new domparser()).parseFromString(data, "application/xml");
  var svg = doc.getElementsByTagName('svg')[0];

  if (!svg.hasAttribute('height')) {
    throw filename ? 'Missed height attribute in ' + filename : 'Missed height attribute';
  }
  if (!svg.hasAttribute('width')) {
    throw filename ? 'Missed width attribute in ' + filename : 'Missed width attribute';
  }

  var height = svg.getAttribute('height');
  var width  = svg.getAttribute('width');

  // Silly strip 'px' at the end, if exists
  height = parseFloat(height);
  width  = parseFloat(width);

  var path = svg.getElementsByTagName('path');

  if (path.length > 1) {
    throw 'Multiple paths not supported' + (filename ? ' (' + filename + ' ' : '');
  }
  if (path.length === 0) {
    throw 'No path data fount' + (filename ? ' (' + filename + ' ' : '');
  }

  path = path[0];

  var d = path.getAttribute('d');

  var transform = '';

  if (path.hasAttribute('transform')) {
    transform = path.getAttribute('transform');
  }

  return {
    height    : height,
    width     : width,
    d         : d,
    transform : transform
  };
}


var parser = new ArgumentParser({
  addHelp: true,
  description: 'Fontello internal tool. Join multiple fonts to single one and create JS configs for processing'
});
parser.addArgument([ '-i', '--input_fonts' ], { help: 'Input fonts paths', required: true, nargs : '+' });
parser.addArgument([ '-o', '--output' ], { help: 'Output font file path', required: true });
parser.addArgument([ '-c', '--output_client' ], { help: 'Output client config path' });
parser.addArgument([ '-s', '--output_server' ], { help: 'Output server config path' });

var args = parser.parseArgs();


// server config, to build svg fonts
// contains uid hash + svg paths, to generate font quickly
var configServer = {
  uids  : {},
  fonts : {},
  metas : {}
};

// client config
// - glyphs, splitted by font
// - font info
var configClient = [];

// Counter
var internalCode = 0xF000;

////////////////////////////////////////////////////////////////////////////////

//
// Scan sources
//

_.forEach(args.input_fonts, function(fontDir) {
  // Iterate each font
  var cfg = yaml.load(fs.readFileSync(path.resolve(fontDir, 'config.yml'), 'utf8'));

  // push font info to server config
  configServer.fonts[cfg.font.fontname] = _.clone(cfg.font, true);
  configServer.metas[cfg.font.fontname] = _.clone(cfg.meta, true);

  // push font info to client item config
  var client_font_info = {
    glyphs  : [],
    font    : _.clone(cfg.font, true),
    meta    : _.clone(cfg.meta, true)
  };

  // iterate glyphs
  _.forEach(cfg.glyphs, function(glyph) {

    if (configServer.uids[glyph.uid]) {
      console.log('Duplicated uid "' + glyph.uid + '"in ' + fontDir);
      process.exit(1);
    }

    // Cleanup fields list
    var glyph_data = _.pick(glyph, ['css', 'code', 'uid', 'search']);

    // Add char code in joined (embedded) font
    glyph_data.charRef = internalCode;
    internalCode++;

    // Push cloned copy to client config
    client_font_info.glyphs.push(_.clone(glyph_data, true));

    // Add more data for server config
    glyph_data.fontname = cfg.font.fontname;

    glyph_data.svg = {};

    // load file & translate coordinates
    var file_name = path.join(fontDir, 'src', 'svg', glyph_data.css + '.svg');
    var svg = parseSvgImage(fs.readFileSync(file_name, 'utf8'), file_name);

    var transform =
     'translate(0, -150) ' +
     'translate(0 500) scale(1 -1) translate(0 -500)';

    glyph_data.svg.file = svgImageTemplate({
      height : svg.height,
      width  : svg.width,
      d      : svg.d,
      transform : svg.transform ? transform + ' ' + svg.transform : transform
    });

    configServer.uids[glyph.uid] = _.clone(glyph_data, true);
  });

  configClient.push(client_font_info);
});

////////////////////////////////////////////////////////////////////////////////

//
// Parse SVG sources, recalculate coordinates & apply transform
//

var tmpDir;

tmpDir = path.resolve('./tmp');
//tmpDir = fstools.tmpdir();
fstools.mkdirSync(tmpDir);


// write glyphs with transform rules, splitted by dirs, because SVGO crashes on big folders
_.forEach(configServer.uids, function(glyph) {
  fstools.mkdirSync(path.join(tmpDir, glyph.fontname));
  fs.writeFileSync(path.join(tmpDir, glyph.fontname, glyph.uid + '.svg'), glyph.svg.file, 'utf8');
});

// Optimize by directories and then write out final configs
async.eachSeries(
  _.keys(configServer.fonts),
  // iterator
  function (fontname, next) {
    console.log('running SVGO on font ' + fontname);
    execFile(
      path.resolve('./node_modules/.bin/svgo'),
      [ '-f', path.join(tmpDir, fontname), '--config', path.resolve('./embed.svgo.yml') ],
      next
    );
  },
  // callback
  function (err) {
    if (err) {
      console.log(err);
      process.exit(1);
    }

    // load back glyph data
    _.forEach(configServer.uids, function(glyph) {
      var file_name = path.join(tmpDir, glyph.fontname, glyph.uid + '.svg');
      // delete file info & fill glyph.svg with parsed data
      glyph.svg = parseSvgImage(fs.readFileSync(file_name, 'utf8'), file_name);

      // fontforge dirty fix
      glyph.svg.d = glyph.svg.d.replace(/zm/g, 'z m');
    });

    // Write out configs
    fs.writeFileSync(args.output_client, 'module.exports = ' + JSON.stringify(configClient, null, 2), 'utf8');
    fs.writeFileSync(args.output_server, 'module.exports = ' + JSON.stringify(configServer, null, 2), 'utf8');

    // cleanup
    fstools.removeSync(tmpDir);


    // Prepare SVG structures & write font file

    var font = {
      fontname: 'fontello',
      familyname: 'fontello',
      ascent: 850,
      descent: -150
    };

    var glyphs = [];

    _.forEach(configServer.uids, function (glyph) {
      glyphs.push({
        heigh : glyph.svg.height,
        width : glyph.svg.width,
        d     : glyph.svg.d,
        css   : glyph.uid,
        unicode : '&#x' + glyph.charRef.toString(16) + ';'
      });
    });

    var svgOut = svgFontTemplate({
      font : font,
      glyphs : glyphs,
      metadata: 'internal font for fontello.com website',
      fontHeight : font.ascent - font.descent
    });

    fs.writeFileSync(args.output, svgOut, 'utf8');
  }
);
