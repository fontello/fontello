/*global $, _, ko, N*/


'use strict';


////////////////////////////////////////////////////////////////////////////////


var map = Object(null);


////////////////////////////////////////////////////////////////////////////////


function findFreeCode() {
  var code = N.config.app.autoguess_charcode.min;

  while (code <= N.config.app.autoguess_charcode.max) {
    if (!map[code]) {
      // got unused code
      return code;
    }

    // try next code
    code++;
  }

  // SHOULD NEVER HAPPEN (only if max pool size is < amount of all glyphs):
  throw "Run out of free codes";
}


function allocate(model, code, prevCode) {
  var conflict = map[code];

  if (model === map[prevCode]) {
    map[prevCode] = null;
  }

  map[code] = model;

  if (conflict && conflict !== model) {
    conflict.code(prevCode === code ? findFreeCode() : prevCode);
  }
}


module.exports = function (model) {
  var
  code = model.code(),
  prev = code;

  // code is already taken
  if (map[code]) {
    model.code(code = findFreeCode());
  }

  // register new model
  map[code] = model;

  // keep track on previous value
  model.code.subscribe(function (code) {
    prev = code;
  }, model, 'beforeChange');

  // handle code change
  model.code.subscribe(function (code) {
    allocate(model, code, prev);
  });
};
