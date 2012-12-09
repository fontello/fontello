'use strict';


// 3rd-party
var stylus = require('stylus');


module.exports = function (pathname, callback) {
  pathname.read(function (err, str) {
    if (err) {
      callback(err);
      return;
    }

    stylus(str, {
      paths:    [pathname.dirname],
      filename: String(pathname),
      _imports: []
    }).render(callback);
  });
};
