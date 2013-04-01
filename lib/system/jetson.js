// Small utility belt for JS serialization
//
// Used instead of JASON as we needed a better serialization support for
// regexps, functions and dates. And After all it's even ligther.


'use strict';


var _ = require('lodash');


////////////////////////////////////////////////////////////////////////////////


function serializeArray(obj, keys) {
  var chunks = [];

  _.each(obj, function (val) {
    chunks.push(exports.serialize(val, keys));
  });

  return '[' + chunks.join(',') + ']';
}


function serializeObject(obj, keys) {
  var chunks = [];

  // always deal with sorted list of keys
  _.each((keys || _.keys(obj)).sort(), function (k) {
    var key, subkeys;

    if (!_.isArray(k)) {
      key = k;
    } else {
      k       = k.slice();
      key     = k.shift();
      subkeys = k.pop();
    }

    chunks.push(JSON.stringify(key) + ':' +
                exports.serialize(obj[key], subkeys));
  });

  return '{' + chunks.join(',') + '}';
}


////////////////////////////////////////////////////////////////////////////////


exports.serialize = function (obj, keys) {
  if (_.isFunction(obj)) {
    return obj.toString();
  }

  if (_.isRegExp(obj)) {
    return 'new RegExp(' + JSON.stringify(obj.source) + ')';
  }

  if (_.isDate(obj)) {
    return 'new Date("' + String(obj) + '")';
  }

  if (_.isArray(obj)) {
    return serializeArray(obj, keys);
  }

  if (_.isObject(obj)) {
    return serializeObject(obj, keys);
  }

  return JSON.stringify(obj);
};
