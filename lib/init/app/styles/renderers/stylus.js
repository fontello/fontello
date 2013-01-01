'use strict';


// 3rd-party
var stylus  = require('stylus');


////////////////////////////////////////////////////////////////////////////////


module.exports = function (pathname, callback) {
  pathname.read(function (err, str) {
    var style;

    if (err) {
      callback(err);
      return;
    }

    style = stylus(str, {
      paths:    [pathname.dirname],
      filename: String(pathname)
    });

    style.render(callback);
  });
};
