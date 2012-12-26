'use strict';


/**
 *  Support.safePropName(str) -> String
 *  - str (String): Property name to make safe
 *
 *  Makes string safe to be used as property:
 *
 *     safePropName('foo-bar');
 *     // -> '["foo-bar"]'
 *
 *  Useful to make API path safe to be as porperty name:
 *
 *    ['a-b-c', 1, 'foo.bar'].map(safePropName).join("");
 *    //-> '["a-b-c"][1]["foo.bar"]'
 *
 *  Used for trees browserifications.
 **/
module.exports = function safePropName(str) {
  return '[' + JSON.stringify(str) + ']';
};
