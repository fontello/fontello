'use strict';


// 3rd-party
var _ = require('underscore');


////////////////////////////////////////////////////////////////////////////////


module.exports = function deepMerge(dst, src) {
  _.each(src, function (val, key) {
    if (!_.isObject(val)) {
      dst[key] = val;
      return;
    }

    deepMerge(dst[key] || (dst[key] = {}), val);
  });

  return dst;
};
