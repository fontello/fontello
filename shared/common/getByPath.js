'use strict';


/**
 *  shared
 **/

/**
 *  shared.common
 **/


/*global nodeca, _*/


////////////////////////////////////////////////////////////////////////////////


/**
 *  shared.common.getByPath(obj, path) -> Mixed
 *  - obj (Object): Object to get value from
 *  - path (String): Path of a property
 *
 *  Extracts property from more than one level down, via a `.` delimited
 *  string of property names.
 *
 *
 *  ##### Example
 *
 *      shared.common.getByPath({foo: {bar: 123}}, 'foo.bar');
 *      // => 123
 **/
module.exports = function getByPath(obj, path) {
  var parts = path.split('.');

  // this is the fastest way to find nested value:
  // http://jsperf.com/find-object-deep-nested-value

  while (obj && parts.length) {
    obj = obj[parts.shift()];
  }

  return obj;
};
