'use strict';


////////////////////////////////////////////////////////////////////////////////


module.exports = {
  server: function (str, options, callback) {
    var func;

    try {
      func = function () { return str; };
    } catch (err) {
      callback(err);
      return;
    }

    callback(null, func);
  },
  client: function (str, options, callback) {
    var tmpl;

    try {
      tmpl = 'function () { return ' + JSON.stringify(str) + '; }';
    } catch (err) {
      callback(err);
      return;
    }

    callback(null, tmpl);
  }
};
