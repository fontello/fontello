// CSS Renderer.
//
// Exports single function with same signature as Stylus renderer, but that
// simply returns original string.
//


'use strict';


var fs = require('fs');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (file /*, options*/) {
  return {
    css: fs.readFileSync(file, 'utf8'),
    imports: []
  };
};
