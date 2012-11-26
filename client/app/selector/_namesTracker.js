/*global $, _, ko, N*/


'use strict';


////////////////////////////////////////////////////////////////////////////////


var map       = Object(null);
var SUFFIX_RE = /-(\d+)$/;


////////////////////////////////////////////////////////////////////////////////


function increaseSuffix(name) {
  var
  match = SUFFIX_RE.exec(name),
  index = match ? parseInt(match[1], 10) + 1 : 1;

  return name.replace(SUFFIX_RE, '') + '-' + index;
}


function allocate(model, name, prevName) {
  var conflict = map[name];

  if (model === map[prevName]) {
    map[prevName] = null;
  }

  map[name] = model;

  if (conflict && conflict !== model) {
    conflict.name(increaseSuffix(name));
  }
}


module.exports = function (model) {
  var prev = model.name();

  // initial allocation
  allocate(model, prev, prev);

  // keep track on previous value
  model.name.subscribe(function (name) {
    prev = name;
  }, model, 'beforeChange');

  // handle name change
  model.name.subscribe(function (name) {
    allocate(model, name, prev);
  });
};
