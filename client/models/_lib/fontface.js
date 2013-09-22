'use strict';
var _  = require('lodash');

module.exports = function(svg, fontId) {
  // + make dataUri
  // + create style description string

  var cfg = {dataUri : 'data:image/svg+xml,' + encodeURIComponent(svg), fontId : fontId};

  var list =
  '  @font-face {\n' +
  '    font-family: "fml_customFont";\n' +
  '    src: url("${dataUri}") format("svg");\n' +
  '    font-weight: normal;\n' +
  '    font-style: normal;\n' +
  '  }\n';
  return _.template(list, cfg);
};