/*global N*/


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

  if (!model.selected()) {
    return;
  }

  map[code] = model;

  if (conflict && conflict !== model && conflict.selected()) {
    conflict.code(prevCode === code ? findFreeCode() : prevCode);
  }
}


module.exports = function (model) {
  var prev = model.code();

  // keep track on previous code value
  model.code.subscribe(function (code) {
    prev = code;
  }, model, 'beforeChange');

  // handle name change. and call allocation
  model.code.subscribe(function (code) {
    if (model.selected()) {
      allocate(model, code, prev);
    }
  });

  // keep track on selected state, before it's actual change
  // handling beforeChange in order to be able to change code
  // (when it's going to be selected) before allocation handler
  model.selected.subscribe(function (value) {
    var code = model.code();

    // glyph is going to be unselected:
    // remove from the map
    if (value) {
      map[code] = null;
      return;
    }

    // glyphs is going to be selected, but it's code already "taken":
    // find free code and update model
    if (map[code]) {
      code = findFreeCode(code);
      model.code(code);
    }

    map[code] = model;
  }, model, 'beforeChange');
};
