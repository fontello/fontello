'use strict';


// 3rd-party
var ejs = require('ejs');


////////////////////////////////////////////////////////////////////////////////


module.exports = {
  server: function (str, options, callback) {
    var func;

    try {
      func = ejs.compile(str);
    } catch (err) {
      callback(err);
      return;
    }

    callback(null, func);
  },
  client: function (str, options, callback) {
    var tmpl;

    try {
      // FIXME: +1 ticket to let us generate client-side functions easily:
      //        https://github.com/visionmedia/ejs/issues/36
      tmpl = 'function () { throw "EJS is server-side templating engine only"; }';
    } catch (err) {
      callback(err);
      return;
    }

    callback(null, tmpl);
  }
};
