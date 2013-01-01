/**
 *  class Support.Hooker
 *
 *  Hooks manager. Provides easy way to manage before/after filter chains.
 *
 *  ##### Example
 *
 *      var hooks = new Hooker();
 *
 *      //
 *      // run function, with before/after hooks...
 *      hooks.before('spanish.pub', 20, function (callback) {
 *        console.log('Amigos!');
 *        callback();
 *      });
 *
 *      hooks.before('spanish.pub', 10, function (callback) {
 *        console.log('Hola,');
 *        callback();
 *      });
 *
 *      hooks.after('spanish.pub', function (callback) {
 *        console.log('Adios!');
 *        callback();
 *      });
 *
 *      hooks.run('spanish.pub', function (callback) {
 *        console.log('...inside pub...');
 *        callback();
 *      }, function (err) {
 *        if (err) {
 *          console.log(err);
 *          return;
 *        }
 *
 *        console.log('DONE');
 *      });
 *      // -> Hola,
 *      // -> Amigos!
 *      // -> ...inside pub...
 *      // -> Adios!
 *      // -> DONE
 *
 *      //
 *      // run function without before/after hooks...
 *      hooks.run('silent-room', function (callback) {
 *        console.log('...inside pub...');
 *        callback();
 *      }, function (err) {
 *        if (err) {
 *          console.log(err);
 *          return;
 *        }
 *
 *        console.log('DONE');
 *      });
 *      // -> ...inside pub...
 *      // -> DONE
 *
 *      //
 *      // interrupt execution of the chain
 *      hooks.before('movie', function (callback) {
 *        if (global.hasPopcorn) {
 *          callback();
 *          return;
 *        }
 *
 *        callback(new Error("No pop corn left..."));
 *      });
 *
 *      global.hasPopcorn = true;
 *      hooks.run('movie', function (callback) {
 *        console.log('...watching movie...');
 *        callback();
 *      }, function (err) {
 *        if (err) {
 *          console.log(err);
 *          return;
 *        }
 *
 *        console.log('DONE');
 *      });
 *      // -> ...watching movie...
 *      // -> DONE
 *
 *      global.hasPopcorn = false;
 *      hooks.run('movie', function (callback) {
 *        console.log('...watching movie...');
 *        callback();
 *      }, function (err) {
 *        if (err) {
 *          console.log(err);
 *          return;
 *        }
 *
 *        console.log('DONE');
 *      });
 *      // -> No pop corn left...
 *
 *
 *  ##### Options of before/after hooks
 *
 *  `options` can be given as `Number`, in this case it's a shorthand for:
 *  `{weight: <Number>}`. If `weight` is not specified, then it's `10` by
 *  default.
 *
 *  You might also provide an exclusion list: `{exclude: <Array>}`, which is
 *  an array of `buckets` you want to exclude. Each element of exclude array
 *  is a string with `bucket` name or bucet pattern. Pattern accepts `*` and
 *  `**` wildcards:
 *
 *      hooks.before('', {exclude: ['foo.**'], function (cb) {
 *        console.log('excluding foo.**');
 *      });
 *
 *      hooks.before('', {exclude: ['bar.*'], function (cb) {
 *        console.log('excluding bar.*');
 *      });
 *
 *      hooks.before('', {exclude: ['baz'], function (cb) {
 *        console.log('excluding baz');
 *      });
 *
 *      hooks.run('foo.bar.baz', function () {});
 *      // -> excluding bar.*
 *      // -> excluding baz
 *
 *      hooks.run('bar.baz', function () {});
 *      // -> excluding foo.**
 *      // -> excluding baz
 *
 *      hooks.run('bar.baz.foo', function () {});
 *      // -> excluding foo.**
 *      // -> excluding bar.*
 *      // -> excluding baz
 *
 *      hooks.run('baz', function () {});
 *      // -> NOTHING
 **/


/*global underscore*/


'use strict';


// 3rd-party
var _           = underscore;
var SortedArray = require('collections/sorted-array');
var Async       = require('async');


////////////////////////////////////////////////////////////////////////////////


function noop() {}


function comparePriorities(a, b) {
  return Object.compare(a.weight, b.weight);
}


////////////////////////////////////////////////////////////////////////////////


/**
 *  new Support.Hooker()
 **/
var Hooker = module.exports = function Hooker() {
  this.__hooks__  = {};
  this.__cache__  = {}; // cache of sorted hooks

  // init default logger
  this.setDebugLogger();
};


// returns before/after chains for given `bucket`
function get_hooks(self, bucket) {
  if (!self.__hooks__[bucket]) {
    self.__hooks__[bucket] = {
      before: new SortedArray([], null, comparePriorities),
      after:  new SortedArray([], null, comparePriorities),
      ensure: new SortedArray([], null, comparePriorities)
    };
  }

  return self.__hooks__[bucket];
}


// returns array of functions which pass given exclude conditions
function get_filtered_funcs(bucket, hooks) {
  var filtered = _.filter(hooks, function (hook) {
    return _.all(hook.exclude, function (re) { return !re.test(bucket); });
  });

  return _.map(filtered, function (hook) { return hook.func; });
}


// returns sorted before/after hooks for bucket with it's parents
function get_sorted_hooks(self, bucket) {
  var hooks, before, after, ensure, parts;

  if (!self.__cache__[bucket]) {
    parts  = bucket.split('.');
    before = new SortedArray([], null, comparePriorities);
    after  = new SortedArray([], null, comparePriorities);
    ensure = new SortedArray([], null, comparePriorities);

    while (parts.length) {
      hooks   = get_hooks(self, parts.join('.'));
      before  = before.concat(hooks.before);
      after   = after.concat(hooks.after);
      ensure  = ensure.concat(hooks.ensure);

      parts.pop();
    }

    // add common/global hooks
    hooks   = get_hooks(self, '');
    before  = before.concat(hooks.before);
    after   = after.concat(hooks.after);
    ensure  = ensure.concat(hooks.ensure);

    // calculate and cache final result
    self.__cache__[bucket] = {
      before: get_filtered_funcs(bucket, before.slice()),
      after:  get_filtered_funcs(bucket, after.slice()),
      ensure: get_filtered_funcs(bucket, ensure.slice())
    };
  }

  return self.__cache__[bucket];
}


// add fn to the before/after `chain` of the `bucket`
function filter(self, chain, bucket, options, fn) {
  var hooks = get_hooks(self, bucket), weight = 0, exclude;

  if (!fn) {
    fn = options;
    options = {};
  }

  // scenario: filter(this, bucket, weight, fn)
  if (+options === options) {
    weight  = +options;
    options = {};
  }

  // scenario: filter(this, bucket, {weight: 123}, fn)
  if (options.weight) {
    weight = +options.weight;
    delete options.weight;
  }

  // prepare exclude list
  exclude = _.map(options.exclude || [], function (str) {
    str = str.replace(/[*]{1,2}/g, function (m) {
      return ('*' === m[0]) ? '[^.]+' : '.+';
    });

    return new RegExp('^' + str + '$', 'i');
  });

  // function is required
  if ('function' !== typeof fn) {
    // TODO log warning
    return false;
  }

  // clean the cache
  self.__cache__ = {};

  hooks[chain].push({weight: weight, exclude: exclude, func: fn});
  return true;
}


/** alias of: Support.Hooker.new
 *  Support.Hooker.create() -> Support.Hooker
 *
 *  Constructor proxy.
 **/
Hooker.create = function create() {
  return new Hooker();
};


/**
 *  Support.Hooker#before(bucket[, options], fn) -> Boolean
 *  - bucket (String): Bucket name to register `fn` with.
 *  - options (Object): See description below.
 *  - fn (Function): Function that must be executed.
 *
 *  Registers `fn` to be executed before `block` upon [[Support.Hooker#run]].
 *  Giving `options` as a Number is a short-hand syntax for `{weight: <value>}`.
 *
 *
 *  ##### Options
 *
 *  - *weight* (Number): Priority weight. Functions with lower weight executed
 *    eariler than functions registered for the same bucket but higher weight.
 *    Default: `0`.
 *  - *exclude* (Array): List of bucket patterns that should not execute given
 *    `fn` during [[Support.Hooker#run]].
 *    Default: `[]`
 **/
Hooker.prototype.before = function before(bucket, options, fn) {
  return filter(this, 'before', bucket, options, fn);
};


/**
 *  Support.Hooker#after(bucket[, options], fn) -> Boolean
 *
 *  Registers `fn` to be executed after `block` upon [[Support.Hooker#run]].
 *  See description of [[Support.Hooker#before]].
 **/
Hooker.prototype.after = function after(bucket, options, fn) {
  return filter(this, 'after', bucket, options, fn);
};


/** alias of: Hooker#after
 *  Support.Hooker#on(bucket[, options], fn) -> Boolean
 **/
Hooker.prototype.on = Hooker.prototype.after;


/**
 *  Support.Hooker#ensure(bucket[, options], fn) -> Boolean
 *
 *  Registers `fn` to be executed after all before and after handlers, even if
 *  execution was interrupted, upon [[Support.Hooker#run]].
 *
 *  See description of [[Support.Hooker#before]].
 **/
Hooker.prototype.ensure = function ensure(bucket, options, fn) {
  return filter(this, 'ensure', bucket, options, fn);
};


/**
 *  Support.Hooker#run(bucket[, arg1[, argN]], block, callback, thisArg) -> Void
 *
 *  **NOTICE** We support nesting of buckets. Nested buckets are separated with
 *  `.` (dot) so running hooks for `foo.bar` bucket will run:
 *
 *  - before `foo`
 *  - before `foo.bar`
 *  - block
 *  - after `foo.bar`
 *  - after `foo`
 **/
Hooker.prototype.run = function run(bucket) {
  var self = this, hooks, before, after, ensure, args, ctx, block, callback;

  args = Array.prototype.slice.call(arguments, 1);
  ctx  = args.pop();

  if ('function' !== typeof ctx) {
    callback = args.pop();
  } else {
    callback = ctx;
    ctx = null;
  }

  block = [args.pop()];

  // make sure block is a function. otherwise remove it from the execution chain
  if ('function' !== typeof block[0]) { block = []; }

  // Fatal fuckup! SHOULD never happen.
  if ('function' !== typeof callback) {
    throw new TypeError('Hooker#run requires callback to be a function');
  }

  hooks   = get_sorted_hooks(this, bucket);
  before  = hooks.before;
  after   = hooks.after;
  ensure  = hooks.ensure;

  self.__debug__.start(bucket);
  Async.forEachSeries([].concat(before, block, after), function (fn, next) {
    try {
      self.__debug__.step(bucket, fn.name || '<anonymous>');
      fn.apply(ctx, args.concat([next]));
    } catch (err) {
      next(err);
    }
  }, function (err/*, results */) {
    self.__debug__.finish(bucket);

    Async.forEachSeries(ensure, function (fn, next) {
      try {
        self.__debug__.step(bucket, fn.name || '<anonymous>');
        fn.apply(ctx, args.concat([function () { next(); }]));
      } catch (err) {
        next();
      }
    }, function () {
      callback.call(ctx, err);
    });
  });
};


/**
 *  Support.Hooker#knownBuckets -> Array
 *
 *  List of all known (registered) buckets.
 **/
Object.defineProperty(Hooker.prototype, 'knownBuckets', {
  get: function () {
    return Object.getOwnPropertyNames(this.__hooks__);
  }
});


/**
 *  Support.Hooker#setDebugLogger(logger) -> Void
 *  - logger (Object):
 *
 *  Sets debug logger, which must provide methods:
 *
 *  - `start(bucket)`
 *  - `step(bucket, funcName)`
 *  - `finish(bucket)`
 **/
Hooker.prototype.setDebugLogger = function setDebugLogger(logger) {
  this.__debug__ = {};

  _.each(['start', 'step', 'finish'], function (name) {
    this.__debug__[name] = (logger || {})[name] || noop;
  }, this);
};
