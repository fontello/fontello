'use strict';


////////////////////////////////////////////////////////////////////////////////


module.exports = function () {
  var
  start = process.hrtime(),
  ret   = Object(null);

  Object.defineProperty(ret, 'elapsed', {
    get: function () {
      var
      diff    = process.hrtime(start),
      elapsed = (diff.shift() * 1000) + (diff.pop() / 1000000);

      return '(' + elapsed.toFixed() + 'ms)';
    }
  });

  return ret;
};
