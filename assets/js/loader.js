//= require modernizr.custom
//= require_self


/*jshint browser:true,node:false*/
/*global yepnope*/


(function () {
  'use strict';


  var toString  = Object.prototype.toString,
      hasOwn    = Object.prototype.hasOwnProperty;


  // check if `obj` is a function
  function isFunction(obj) {
    return '[object Function]' === toString.call(obj);
  }


  // check if `obj` is array
  function isArray(obj) {
    return '[object Array]' === toString.call(obj);
  }


  // check if `obj` is a plain object: not a null, underfined, function, array
  // or instance of something else.
  function isPlainObject(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor property.
    if (!obj || '[object Object]' !== toString.call(obj)) {
      return false;
    }

    try {
      // Not own constructor property must be Object
      if (obj.constructor &&
        !hasOwn.call(obj, "constructor") &&
        !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
        return false;
      }
    } catch ( e ) {
      // IE8,9 Will throw exceptions on certain host objects #9897
      return false;
    }

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    /*jshint noempty:false*/
    for (var key in obj) {}

    return key === undefined || hasOwn.call(obj, key);
  }


  // Simple `each` iterator
  function each(obj, iter) {
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        iter(obj[k], k);
      }
    }
  }


  function inject_tree(tree, branch) {
    // make sure tree is a plain object or a function
    tree = (isPlainObject(tree) || isFunction(tree)) && tree || {};

    each(branch || {}, function (val, key) {
      if (0 <= key.indexOf('.')) {
        // merg in `{"foo.bar.baz": {}}` trees
        var parts = key.split('.'), parent = parts.shift(), childs = {};
        childs[parts.join('.')] = val;
        tree[parent] = inject_tree(tree[parent], childs);
        return;
      }

      if (isPlainObject(val)) {
        tree[key] = inject_tree(tree[key], val);
        return;
      }

      if (isFunction(val)) {
        tree[key] = inject_tree(val, inject_tree(tree[key], val));
        return;
      }

      // plain value - do not try to merge - just override
      tree[key] = val;
    });

    // Return the modified object
    return tree;
  }


  window.inject_tree = inject_tree;
}());
