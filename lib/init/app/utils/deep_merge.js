'use strict';


/*global underscore, N*/


// 3rd-party
var _ = underscore;


////////////////////////////////////////////////////////////////////////////////


module.exports = function deepMerge(dst, src) {
  _.each(src, function (val, key) {
    if (!dst.hasOwnProperty(key)) {
      dst[key] = val;
      return;
    }

    if (!_.isObject(dst[key]) && !_.isFunction(dst[key])) {
      dst[key] = val;
      return;
    }

    if (_.isFunction(val)) {
      dst[key] = deepMerge(val, dst[key]);
      return;
    }

    deepMerge(dst[key], val);
  });

  return dst;
};
