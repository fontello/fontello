// Create @fontface text for CSS
//
'use strict';

var _  = require('lodash');
var svg2ttf = require('svg2ttf');
var b64     = require('base64-js');

module.exports = function (svg, fontId) {
  if (!svg) {
    return;
  }

  var ttf = svg2ttf(svg, {}).buffer;
  var fontInfo = {
    ttfDataUri : 'data:font/truetype;base64,' + b64.fromByteArray(ttf),
    fontId
  };

  var fontfaceTemplate =
  '  @font-face {\n' +
  '    font-family: "fml_${fontId}";\n' +
  '    src: url("${ttfDataUri}") format("truetype");\n' +
  '    font-weight: normal;\n' +
  '    font-style: normal;\n' +
  '  }\n';
  return _.template(fontfaceTemplate)(fontInfo);
};
