'use strict';


/*global $, _*/


module.exports = function inplaceEditor($el, options) {
  var get, set, filter;

  filter = options.filter || function (val) { return val; };

  if (options.html) {
    get = function () { return $el.html(); };
    set = function (val) { $el.html(val); };
  } else {
    get = function () { return $el.text(); };
    set = function (val) { $el.text(val); };
  }

  $el.on('blur keyup paste', _.throttle(function () {
    var raw = get(), clean = filter(raw);

    if (raw !== clean) {
      // set clena value only if it differs
      set(clean);
    }

    // emit change event
    $el.trigger('change', [clean]);
  }, 100)).attr('contenteditable', true);

  return $el;
};
