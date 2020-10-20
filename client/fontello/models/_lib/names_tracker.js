'use strict';


////////////////////////////////////////////////////////////////////////////////


var map       = Object(null);
var SUFFIX_RE = /-(\d+)$/;


////////////////////////////////////////////////////////////////////////////////


function findFreeName(name) {
  var index = 1;

  while (map[name]) {
    name = name.replace(SUFFIX_RE, '') + '-' + index;
    index++;
  }

  return name;
}


function allocate(model, name, prevName) {
  var conflict = map[name];

  if (model === map[prevName]) {
    map[prevName] = null;
  }

  map[name] = model;

  if (conflict && conflict !== model) {
    conflict.name(findFreeName(name));
  }
}


////////////////////////////////////////////////////////////////////////////////


exports.observeGlyph = function (model) {
  var prev = model.name();

  // If new glyph created with "selected" flag,
  // mark it's code as allocated
  //
  // Also, fix code if busy, however, that should not happen
  //
  if (model.selected()) {
    // unicode -> don't try to remap by default
    allocate(model, model.name(), null);
  }
  // keep track on previous name value
  model.name.subscribe(function (name) {
    prev = name;
  }, model, 'beforeChange');

  // handle name change. and call allocation
  model.name.subscribe(function (name) {
    if (model.selected()) {
      allocate(model, name, prev);
    }
  });
};


exports.observeFontsList = function (model) {
  // keep track on selected state, before it's actual change
  // handling beforeChange in order to be able to change name
  // (when it's going to be selected) before allocation handler
  model.selectedGlyphs.subscribe(function (changes) {
    changes.forEach(({ status, value }) => {
      var name = value.name();

      // glyph is unselected: remove from the map
      if (status === 'deleted') {
        map[name] = null;
        return;
      }

      // glyphs is going to be selected, but it's name already "taken":
      // find free name and update model
      if (map[name] && map[name] !== value) {
        name = findFreeName(name);
        value.name(name);
      }

      map[name] = value;
    });
  }, model, 'arrayChange');
};
