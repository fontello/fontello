'use strict';
var _  = require('lodash');
var svg2ttf = require('svg2ttf');

module.exports = function(svg, fontId) {
  if (!svg) {
    return;
  }

  var ttfStr = String.fromCharCode.apply(null, svg2ttf(svg, {}).buffer);
  var fontInfo = {
    svgDataUri : 'data:image/svg+xml,' + encodeURIComponent(svg),
    ttfDataUri : 'data:font/truetype;base64,' + btoa(ttfStr),
    fontId : fontId
  };

  var fontfaceTemplate =
  '  @font-face {\n' +
  '    font-family: "fml_${fontId}";\n' +
  '    src: url("${svgDataUri}") format("svg");\n' +
  '    src: url("${ttfDataUri}") format("truetype");\n' +
  '    font-weight: normal;\n' +
  '    font-style: normal;\n' +
  '  }\n';
  return _.template(fontfaceTemplate, fontInfo);
};