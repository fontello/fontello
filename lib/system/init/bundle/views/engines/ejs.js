// EJS view compiler
//


'use strict';


var ejs = require('ejs');


////////////////////////////////////////////////////////////////////////////////


exports.server = function (string /*, options*/) {
  return ejs.compile(string);
};


exports.client = function (/*string, options*/) {
  // FIXME: +1 ticket to let us generate client-side functions easily:
  //        https://github.com/visionmedia/ejs/issues/36
  return 'function () { throw new Error("EJS is server-side templating engine only"); }';
};
