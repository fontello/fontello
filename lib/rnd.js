'use strict';


// stdlib
var crypto = require('crypto');


////////////////////////////////////////////////////////////////////////////////


// rnd() -> String
//
// returns random generated string
//
module.exports = function rnd() {
  return crypto.randomBytes(20).toString('hex');
};
