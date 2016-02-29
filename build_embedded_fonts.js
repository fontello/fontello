#!/usr/bin/env node


'use strict';

var fs        = require('fs');
var path      = require('path');
var _         = require('lodash');
var yaml      = require('js-yaml');
var Domparser      = require('xmldom').DOMParser;
var ArgumentParser = require('argparse').ArgumentParser;
var SvgPath   = require('svgpath');


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

  var doc = (new Domparser()).parseFromString(data, 'application/xml');
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

  return { height, width, d, transform };
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

_.forEach(args.input_fonts, function (fontDir) {
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
  _.forEach(cfg.glyphs, function (glyph) {

    if (configServer.uids[glyph.uid]) {
      /*eslint-disable no-console*/
      console.log('Duplicated uid "' + glyph.uid + '"in ' + fontDir);
      process.exit(1);
    }

    // Cleanup fields list
    var glyph_data = _.pick(glyph, [ 'css', 'code', 'uid', 'search', 'css-ext' ]);

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

    // FIXME: Apply transform from svg file. Now we understand
    // pure paths only.
    var scale = 1000 / svg.height;

    glyph_data.svg.width = +(svg.width * scale).toFixed(1);
    glyph_data.svg.d = new SvgPath(svg.d)
                            .scale(scale)
                            .abs().round(1).rel()
                            .toString();

    configServer.uids[glyph.uid] = _.clone(glyph_data, true);
  });

  configClient.push(client_font_info);
});

//
// Write out configs
//

fs.writeFileSync(args.output_client, 'module.exports = ' + JSON.stringify(configClient, null, 2), 'utf8');
fs.writeFileSync(args.output_server, 'module.exports = ' + JSON.stringify(configServer, null, 2), 'utf8');

//
// Prepare SVG structures & write font file
//

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
    d     : new SvgPath(glyph.svg.d)
                  .scale(1, -1)
                  .translate(0, 850)
                  .abs().round(0).rel()
                  .toString(),
    css   : glyph.uid,
    unicode : '&#x' + glyph.charRef.toString(16) + ';'
  });
});

var svgOut = svgFontTemplate({
  font,
  glyphs,
  metadata: 'internal font for fontello.com website',
  fontHeight : font.ascent - font.descent
});

fs.writeFileSync(args.output, svgOut, 'utf8');
