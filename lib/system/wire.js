/**
 *  class Wire
 **/


(function (root) {
  "use strict";


  //////////////////////////////////////////////////////////////////////////////


  function noop() {}


  //
  // Helpers for cross-browser compatibility
  //


  var isString = function isString(obj) {
    return Object.prototype.toString.call(obj) === '[object String]';
  };

  var isArray = Array.isArray || function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  var isFunction = function isFunction(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
  };

  // 
  // Simplified stable sort implementation from Lo-Dash (http://lodash.com/)
  //

  function compareAscending(a, b) {
    var ai = a.index,
        bi = b.index;

    a = a.criteria;
    b = b.criteria;

    // ensure a stable sort in V8 and other engines
    // http://code.google.com/p/v8/issues/detail?id=90
    if (a !== b) {
      if (a > b || typeof a === 'undefined') {
        return 1;
      }
      if (a < b || typeof b === 'undefined') {
        return -1;
      }
    }

    return ai < bi ? -1 : 1;
  }

  function stableSort(collection, property) {
    var index
      , length = collection.length
      , result = new Array(length);

    for (index = 0; index < length; index += 1) {
      result[index] = {
        criteria: property ? collection[index][property] : collection[index]
      , index: index
      , value: collection[index]
      };
    }

    result.sort(compareAscending);

    for (index = 0; index < length; index += 1) {
      result[index] = result[index].value;
    }

    return result;
  }


  //////////////////////////////////////////////////////////////////////////////


  // Structure to hold handler data
  function WireHandler(channel, options, func) {
    this.channel  = channel;
    this.func     = func;
    this.name     = func.name || "<anonymous>";
    this.sync     = 0 === func.length || 1 === func.length;
    this.once     = Boolean(options.once);
    this.ensure   = Boolean(options.ensure);
    this.priority = Number(options.priority || 0);
    this.ncalled  = 0;
    this.pattern  = new RegExp("^" + channel.replace(/\*+/g, function (m) {
                      // '*' - anything but "dot", ":" & "/"
                      // '**' -
                      return '*' === m ? '[^.:/]+?' : '.+?';
                    }) + "$");
  }


  //////////////////////////////////////////////////////////////////////////////


  function Wire() {
    this.__handlers__       = [];
    this.__sortedCache__    = [];
    this.__knownChannels__  = {};
    this.__skips__          = {};
  }


  Wire.prototype.getHandlers = function (channel) {
    var skip_set = this.__skips__[channel] || {},
        result = [];

    if (!this.__sortedCache__[channel]) {

      this.__handlers__.forEach(function (handler) {
        if (handler.pattern.test(channel) && !skip_set[handler.name]) {
          result.push(handler);
        }
      });

      // We must use stable sort here to be sure, that handlers in the resulting
      // list will be placed exactly in the order they are declared.
      this.__sortedCache__[channel] = stableSort(result, 'priority');
    }

    return this.__sortedCache__[channel];
  };


  // Internal helper that runs handlers for a single channel
  function emitSingle(self, channel, params, callback) {
    var stash = self.getHandlers(channel).slice()
      , wh, fn, _err;

    // iterates through handlers of stash
    function walk(err) {

      // chain finished - exit
      if (!stash.length) {
        callback(err);
        return;
      }

      // Get next element
      wh = stash.shift();
      fn = wh.func;

      // if error - skip all handlers except 'ehshured'
      if (err && !wh.ensure) {
        walk(err);
        return;
      }

      wh.ncalled++;

      if (wh.once) {
        self.off(wh.channel, fn);
      }

      // Call handler, but protect err from overrite,
      // if already exists
      if (!wh.sync) {
        fn(params, function (_err) {
          walk(err || _err);
        });
      } else {
        _err = fn(params);
        walk(err || _err);
      }

      return;
    }

    // start stash walker
    walk();
  }


  /**
   *  Wire#emit(channels, params[, callback]) -> Void
   *  - channels (String|Array):
   *  - params (Mixed):
   *  - callback (Function):
   *
   *  Sends message with `params` into the `channel`. Once all sync and ascync
   *  handlers finished, optional `callback(err)` (if specified) fired.
   **/
  Wire.prototype.emit = function (channels, params, callback) {
    var self = this, _chs, chan;

    callback = callback || noop;

    // slightly optimize regular calls, with single channel
    //
    if (!isArray(channels)) {
      emitSingle(self, channels, params, callback);
      return;
    }

    // Lot of channel - do chaining
    //
    _chs = channels.slice();

    function walk(err) {
      if (err || !_chs.length) {
        callback(err);
        return;
      }

      chan = _chs.shift();
      emitSingle(self, chan, params, walk);
    }

    walk();
  };


  /**
   *  Wire#on(channels[, options], handler) -> Void
   *  - channels (String | Array):
   *  - options (Object):
   *  - handler (Function):
   *
   *  Registers `handler` to be executed upon messages in the a single channel
   *  or a sequence of channels stored in `channels` parameter. Handler can be
   *  either sync function:
   *
   *      wire.on('foobar', function () {
   *        // do stuff here
   *      });
   *
   *      wire.on('foobar', function (params) {
   *        // do stuff here
   *      });
   *
   *  Or it might be an async function with `callback(err)` second argument:
   *
   *      wire.on('foobar', function (params, callback) {
   *        // do stuff here
   *        callback(null);
   *      });
   *
   *
   *  ##### Options
   *
   *  - `priority` (Number, Default: 0)
   *  - `ensure` (Boolean, Default: false)
   *    If `true`, will run handler even if one of previous fired error.
   **/
  Wire.prototype.on = function (channels, options, handler) {
    if (!channels) {
      throw "Channel name required. Use `**` if you want 'any channel'.";
    }

    if (!isArray(channels)) {
      channels = [ channels ];
    }

    if (!handler) {
      handler = options;
      options = null;
    }

    options = options || {};

    if (!isFunction(handler)) {
      throw "Not a function";
    }

    if (0 !== handler.length && 1 !== handler.length && 2 !== handler.length) {
      throw "Function must accept exactly 0 (sync), 1 (sync), or 2 (async) arguments";
    }

    var index, length, channelName, wh;

    for (index = 0, length = channels.length; index < length; index += 1) {
      channelName = channels[index];
      wh = new WireHandler(channelName, options, handler);

      // Count main channel handler (no wildcards, zero-priority)
      if (0 === wh.priority) {
        this.__knownChannels__[channelName] = (this.__knownChannels__[channelName] || 0) + 1;
      }

      this.__handlers__.push(wh);

      // TODO: Move to separate method
      this.__sortedCache__ = [];
    }
  };


  /**
   *  Wire#once(channel[, options], handler) -> Void
   *  - channel (String):
   *  - options (Object):
   *  - handler (Function):
   *
   *  Same as [[Wire#on]] but runs handler one time only.
   **/
  Wire.prototype.once = function (channel, options, handler) {
    if (!handler) {
      handler = options;
      options = {};
    }

    options = options || {};
    options.once = true;

    this.on(channel, options, handler);
  };


  /**
   *  Wire#before(channel[, options], handler) -> Void
   *  - channel (String):
   *  - options (Object):
   *  - handler (Function):
   *
   *  Same as [[Wire#on]] but with "fixed" priority of `-10`
   **/
  Wire.prototype.before = function (channel, options, handler) {
    if (!handler) {
      handler = options;
      options = {};
    }

    options = options || {};
    options.priority = options.priority || -10;

    if (0 <= options.priority) {
      throw "before() requires priority lower than 0";
    }

    return this.on(channel, options, handler);
  };


  /**
   *  Wire#after(channel[, options], handler) -> Void
   *  - channel (String):
   *  - options (Object):
   *  - handler (Function):
   *
   *  Same as [[Wire#on]] but with default priority of `10`
   **/
  Wire.prototype.after = function (channel, options, handler) {
    if (!handler) {
      handler = options;
      options = {};
    }

    options = options || {};
    options.priority = options.priority || 10;

    if (0 >= options.priority) {
      throw "after() requires priority greater than 0";
    }

    return this.on(channel, options, handler);
  };


  /**
   *  Wire#off(channel[, handler]) -> Void
   *  - channel (String):
   *  - handler (Function):
   *
   *  Removes `handler` of a channel, or removes ALL handlers of a channel if
   *  `handler` is not given.
   **/
  Wire.prototype.off = function (channel, handler) {
    var self = this;

    this.__handlers__.forEach(function (wh) {
      if (channel !== wh.channel) {
        return; // continue
      }

      if (handler && (handler !== wh.func)) {
        return; // continue
      }

      // Unkount back zero-priority handler
      if (wh.priority === 0) {
        self.__knownChannels__[channel]--;
      }
      // Just replace with dummy call, to keep cache lists intact
      wh.sync = true;
      wh.func = noop;
    });
  };


  /**
   *  Wire#skip(channel, skipList) -> Void
   *  - channel (String):
   *  - skipList (Array):
   *
   *  Exclude calling list of named handlers for given chennel:
   *
   *      wire.skip('server:static', [
   *        session_start,
   *        cookies_start
   *      ]);
   *
   **/
  Wire.prototype.skip = function (channel, skipList) {
    var self = this;

    if (-1 !== channel.indexOf('*')) {
      throw "No wildcards allowed in Wire.skip() [" + channel + "]";
    }

    if (isString(skipList)) {
      skipList = [skipList];
    }
    if (!isArray(skipList)) {
      throw "skipList must be String or Array of Strings";
    }

    this.__skips__[channel] = this.__skips__[channel] || {};

    skipList.forEach(function (name) {
      self.__skips__[channel][name] = true;
    });

    // TODO: Move to separate method
    this.__sortedCache__ = [];
  };


  /**
   *  Wire#has(channel) -> Boolean
   *  - channel (String):
   *
   *  Returns if `channel` has at least one subscriber
   *  with zero priority (main handler)
   **/
  Wire.prototype.has = function (channel) {
    return Boolean(this.__knownChannels__[channel]);
  };


  /**
   *  Wire#stat() -> Object
   *
   *  Returns full statictics about all channels. Only channels without wildcards
   *  are displayed. Each channel has following structures:
   *
   *  ```
   *  {
   *    name: channnelName,
   *    listeners: Array[handlerStat]
   *  }
   *  ```
   **/
  Wire.prototype.stat = function () {
    var self = this
      , result = []
      , known = [];

    // Scan all unique channels, ignore priorities
    self.__handlers__.forEach(function (wh) {
      if (-1 === known.indexOf(wh.channel)) {
        known.push(wh.channel);
      }
    });
    known = known.sort();

    // Extract info
    known.forEach(function (name) {
      result.push({ name : name, listeners: self.getHandlers(name) });
    });

    return result;
  };


  //////////////////////////////////////////////////////////////////////////////


  // Node.JS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Wire;
  // Browser
  } else {
    root.Wire = Wire;
  }
}(this));
