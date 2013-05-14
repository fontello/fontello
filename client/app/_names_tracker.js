'use strict';


// Hash table used to keep control on automatic name assignment when user
// selects/deselects some glyphs. Keys are names. Values are instances of
// GlyphModel. See app.js for details.
var allocatedNames = {};


function getFreeName(name) {
  var index = 1;

  while (allocatedNames[name]) {
    name = name.replace(/-(\d+)$/, '') + '-' + index;
    index += 1;
  }

  return name;
}


function observe(glyph) {
  // Free old name on change.
  glyph.name.subscribe(function (name) {
    if (allocatedNames[name] === this) {
      allocatedNames[name] = null;
    }
  }, glyph, 'beforeChange');

  // When user set the glyph name to a used one - rename it.
  glyph.name.subscribe(function (name) {
    if (this.selected()) {
      if (allocatedNames[name]) {
        allocatedNames[name].name(getFreeName(name));
      }
      allocatedNames[name] = this;
    }
  }, glyph);

  // When user deselects the glyph - free it's name.
  glyph.selected.subscribe(function (selected) {
    if (!selected) {
      allocatedNames[this.name()] = null;
    }
  }, glyph);
}


exports.observe = observe;
