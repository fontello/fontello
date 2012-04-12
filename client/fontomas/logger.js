// logger does nothing by default
module.exports.assert =
module.exports.error  =
module.exports.debug  = function () {};

// change `false` to `true` to enable logger on development
if (false) {
  module.exports.assert = console.assert;
  module.exports.error  = console.error;
  module.exports.debug  = console.debug ? console.debug : console.log;
}
