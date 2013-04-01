// HTML view compiler
//


'use strict';


////////////////////////////////////////////////////////////////////////////////


exports.server = function (string /*, options*/) {
  return function () { return string; };
};


exports.client = function (string /*, options*/) {
  return 'function () { return ' + JSON.stringify(string) + '; }';
};
