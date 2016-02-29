// Implements simple stopwatch interface:
//
//    var timer = stopwatch();
//
//    // ...
//
//    console.log( timer.elapsed );
//


'use strict';


////////////////////////////////////////////////////////////////////////////////


module.exports = function () {
  let start = process.hrtime(),
      ret   = {};

  Object.defineProperty(ret, 'elapsed', {
    get() {
      let diff    = process.hrtime(start),
          elapsed = (diff.shift() * 1000) + (diff.pop() / 1000000);

      return `(${elapsed.toFixed()}ms)`;
    }
  });

  return ret;
};
