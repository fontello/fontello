/*
 * bag.js - js/css/other loader + kv storage
 *
 * Copyright 2013 Vitaly Puzrin
 * https://github.com/nodeca/bag.js
 *
 * License MIT
 */
(function(window, document) {
  'use strict';

  var head = document.head || document.getElementsByTagName('head')[0];

  //////////////////////////////////////////////////////////////////////////////
  // helpers

  function _nope() { return; }

  var _isString = function isString(obj) {
    return Object.prototype.toString.call(obj) === '[object String]';
  };

  var _isArray = Array.isArray || function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  var _isFunction = function isFunction(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
  };

  var _default = function (obj, src) {
    // extend obj with src properties if not exists;
    _each(src, function(val, key) {
      if (!obj[key]) { obj[key] = src[key]; }
    });
  };


  function _each(obj, iterator) {
    if (_isArray(obj)) {
      if (obj.forEach) {
        return obj.forEach(iterator);
      }
      for (var i = 0; i < obj.length; i++) {
        iterator(obj[i], i, obj);
      }
    } else {
      for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          iterator(obj[k], k);
        }
      }
    }
  }


  function _asyncEach(arr, iterator, callback) {
    callback = callback || _nope;
    if (!arr.length) { return callback(); }

    var completed = 0;
    _each(arr, function (x) {
      iterator(x, function (err) {
        if (err) {
          callback(err);
          callback = _nope;
        } else {
          completed += 1;
          if (completed >= arr.length) {
            callback();
          }
        }
      });
    });
  }


  //////////////////////////////////////////////////////////////////////////////
  // Adapters for Store class

  var DomStorage = function (namespace) {
    this.ns = namespace + '__';
  };


  DomStorage.prototype.exists = function() {
    try {
      localStorage.setItem('__ls_test__','__ls_test__');
      localStorage.removeItem('__ls_test__');
      return true;
    } catch (e) {
      return false;
    }
  };


  DomStorage.prototype.init = function (callback) {
    callback();
  };


  DomStorage.prototype.remove = function (key, callback) {
    callback = callback || _nope;
    localStorage.removeItem(this.ns + key);
    callback();
  };


  DomStorage.prototype.set = function (key, value, expire, callback) {
    var self = this;
    var obj = {
      value: value,
      expire: expire
    };

    var err;

    try {
      localStorage.setItem(self.ns + key, JSON.stringify(obj));
    } catch (e) {
      // On quota error try to reset storage & try again.
      // Just remove all keys, without conditions, no optimizations needed.
      if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
        try {
          _each(localStorage, function(val, name) {
            var key = name.split(self.ns)[ 1 ];
            if (key) { self.remove(key); }
          });
          localStorage.setItem(self.ns + key, JSON.stringify(obj));
        } catch (e) {
          err = e;
        }
      } else {
        err = e;
      }
    }

    callback(err);
  };


  DomStorage.prototype.get = function (key, raw, callback) {
    if (_isFunction(raw)) {
      callback = raw;
      raw = false;
    }

    var obj = localStorage.getItem(this.ns + key);

    if (obj === null) {
      callback(new Error('key not found: ' + key));
      return;
    }

    var err, data;

    try {
      data = JSON.parse(obj);
      data = raw ? data : data.value;
    } catch (e) {
      err = new Error('Can\'t unserialise data: ' + obj);
    }

    callback(err, data);
  };


  DomStorage.prototype.clear = function (expiredOnly, callback) {
    var self = this;
    var now = +new Date();

    _each(localStorage, function(val, name) {
      var key = name.split(self.ns)[ 1 ];

      if (!key) { return; }

      if (!expiredOnly) {
        self.remove(key);
        return;
      }

      var raw;
      self.get(key, true, function(err, data) {
        raw = data; // can use this hack, because get is sync;
      });
      if (raw && (raw.expire > 0) && ((raw.expire - now) < 0)) {
        self.remove(key);
      }
    });

    callback();
  };


  var WebSql = function (namespace) {
    this.ns = namespace;
  };


  WebSql.prototype.exists = function() {
    return (!!window.openDatabase);
  };


  WebSql.prototype.init = function (callback) {
    var db = this.db = window.openDatabase(this.ns, '1.0', 'bag.js db', 2e5);

    if (!db) { return callback('Can\'t open webdql database'); }

    db.transaction(function (tx) {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT, expire INTEGER KEY)',
        [],
        function () { return callback(); },
        function (tx, err) { return callback(err); }
      );
    });
  };


  WebSql.prototype.remove = function (key, callback) {
    callback = callback || _nope;
    this.db.transaction(function (tx) {
      tx.executeSql(
        'DELETE FROM kv WHERE key = ?',
        [key],
        function () { return callback(); },
        function (tx, err) { return callback(err); }
      );
    });
  };


  WebSql.prototype.set = function (key, value, expire, callback) {
    this.db.transaction(function (tx) {
      tx.executeSql(
        'INSERT OR REPLACE INTO kv (key, value, expire) VALUES (?, ?, ?)',
        [key, JSON.stringify(value), expire],
        function () { return callback(); },
        function (tx, err) { return callback(err); }
      );
    });
  };


  WebSql.prototype.get = function (key, callback) {
    this.db.readTransaction(function (tx) {
      tx.executeSql(
        'SELECT value FROM kv WHERE key = ?',
        [key],
        function (tx, result) {
          if (result.rows.length === 0) {
            return callback(new Error('key not found: ' + key));
          }
          var value = result.rows.item(0).value;
          var err, data;
          try {
            data = JSON.parse(value);
          } catch (e) {
            err = new Error('Can\'t unserialise data: ' + value);
          }
          callback(err, data);
        },
        function (tx, err) { return callback(err); }
      );
    });
  };


  WebSql.prototype.clear = function (expiredOnly, callback) {

    if (expiredOnly) {
      this.db.transaction(function (tx) {
        tx.executeSql(
          'DELETE FROM kv WHERE expire > 0 AND expire < ?',
          [+new Date()],
          function () { return callback(); },
          function (tx, err) { return callback(err); }
        );
      });
    } else {
      this.db.transaction(function (tx) {
        tx.executeSql(
          'DELETE FROM kv',
          [],
          function () { return callback(); },
          function (tx, err) { return callback(err); }
        );
      });
    }
  };


  var Idb = function (namespace) {
    this.ns = namespace;
  };


  Idb.prototype.exists = function() {
    return !!(window.indexedDB /*||
              window.webkitIndexedDB ||
              window.mozIndexedDB ||
              window.msIndexedDB*/);
  };


  Idb.prototype.init = function (callback) {
    var self = this;
    var idb = this.idb = window.indexedDB; /* || window.webkitIndexedDB ||
                         window.mozIndexedDB || window.msIndexedDB;*/

    var req = idb.open(self.ns, 2 /*version*/);

    req.onsuccess = function(e) {
      self.db = e.target.result;
      callback();
    };
    req.onblocked = function(e) {
      callback(new Error('IndexedDB blocked. ' + e.target.errorCode));
    };
    req.onerror = function(e) {
      callback(new Error('IndexedDB opening error. ' + e.target.errorCode));
    };
    req.onupgradeneeded = function(e) {
      self.db = e.target.result;
      if (self.db.objectStoreNames.contains('kv')) {
        self.db.deleteObjectStore('kv');
      }
      var store = self.db.createObjectStore('kv', { keyPath: 'key' });
      store.createIndex("expire", "expire", { unique: false });
    };
  };


  Idb.prototype.remove = function (key, callback) {
    var tx = this.db.transaction('kv', 'readwrite');

    tx.oncomplete = function () { callback(); };
    tx.onerror = tx.onabort = function (e) { callback(new Error('Key remove error: ', e.target)); };

    var req = tx.objectStore('kv').delete(key);

    req.onerror = function () { tx.abort(); };
  };


  Idb.prototype.set = function (key, value, expire, callback) {
    var tx = this.db.transaction('kv', 'readwrite');

    tx.oncomplete = function () { callback(); };
    tx.onerror = tx.onabort = function (e) { callback(new Error('Key set error: ', e.target)); };

    var req = tx.objectStore('kv').put({ key: key, value: value, expire: expire });

    req.onerror = function () { tx.abort(); };
  };


  Idb.prototype.get = function (key, callback) {
    var err, result;
    var tx = this.db.transaction('kv');

    tx.oncomplete = function () { callback(err, result); };
    tx.onerror = tx.onabort = function (e) { callback(new Error('Key get error: ', e.target)); };

    var req = tx.objectStore('kv').get(key);

    req.onsuccess = function(e) {
      if (e.target.result) {
        result = e.target.result.value;
      } else {
        err = new Error('key not found: ' + key);
      }
    };
    req.onerror = function () { tx.abort(); };
  };


  Idb.prototype.clear = function (expiredOnly, callback) {
    var keyrange = window.IDBKeyRange; /* ||
                   window.webkitIDBKeyRange || window.msIDBKeyRange;*/
    var self = this, keys = [], tx, tx_read;
    
    if (expiredOnly) {
      tx_read = this.db.transaction('kv');

      tx_read.onerror = function (e) { callback(new Error('Remove expired (read) error: ', e.target)); };

      var cursor = tx_read.objectStore('kv').index('expire').openCursor(keyrange.bound(1, +new Date()));

      cursor.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          keys.push(cursor.primaryKey);
          cursor.continue();
        }
      };

      tx_read.oncomplete = function () {
        // nothing to clear - complete immediately
        if (!keys.length) { return callback(); }

        // create transaction to remove keys
        tx = self.db.transaction('kv', 'readwrite');

        var store = tx.objectStore('kv');
        _each(keys, function(key) {
          store.delete(key);
        });

        tx.oncomplete = function () { callback(); };
        tx.onerror = function (e) { callback(new Error('Remove expired (clear) error: ', e.target)); };
      };

    } else {
      // Just clear everything
      tx = this.db.transaction('kv', 'readwrite');

      tx.oncomplete = function () { callback(); };
      tx.onerror = tx.onabort = function (e) { callback(new Error('Clear error: ', e.target)); };

      var req = tx.objectStore('kv').clear();

      req.onerror = function () { tx.abort(); };
    }
  };


  /////////////////////////////////////////////////////////////////////////////
  // key/value storage with expiration

  var storeAdapters = {
    'indexeddb': Idb,
    'websql': WebSql,
    'localstorage': DomStorage
  };


  // namespace - db name or similar
  // storesList - array of allowed adapter names to use
  //
  var Storage = function (namespace, storesList) {
    var self = this;

    this.db = null;

    // States of db init singletone process
    // 'done' / 'progress' / 'failed' / undefined
    this.initState = undefined;
    this.initStack = [];

    _each(storesList, function(name) {
      // do storage names case insensitive
      name = name.toLowerCase();

      if (!storeAdapters[name]) {
        throw new Error('Wrong storage adapter name: ' + name, storesList);
      }

      if (storeAdapters[name].prototype.exists() && !self.db) {
        self.db = new storeAdapters[name](namespace);
        return false; // terminate search on first success
      }
    });

    if (!self.db) {
      // If no adaprets - don't make error for correct fallback.
      // Just log that we continue work without storing results.
      console.log('None of requested storages available: ' + storesList);
    }
  };


  Storage.prototype.init = function (callback) {
    var self = this;

    if (!this.db) { return callback(new Error('No available db')); }

    if (this.initState === 'done') { return callback(); }

    if (this.initState === 'progress') {
      this.initStack.push(callback);
      return;
    }

    this.initStack.push(callback);
    this.initState = 'progress';

    this.db.init(function (err) {
      self.initState = !err ? 'done' : 'failed';
      _each(self.initStack, function (cb) {
        cb(err);
      });
      self.initStack = [];

      // Clear expired. A bit dirty without callback,
      // but we don't care until clear compleete
      if (!err) { self.clear(true); }
    });
  };


  Storage.prototype.set = function (key, value, expire, callback) {
    var self = this;
    if (_isFunction(expire)) {
      callback = expire;
      expire = undefined;
    }
    callback = callback || _nope;
    expire = expire ? +(new Date()) + (expire * 1000) : 0;

    this.init(function(err) {
      if (err) { return callback(err); }
      self.db.set(key, value, expire, callback);
    });
  };


  Storage.prototype.get = function (key, callback) {
    var self = this;
    this.init(function(err) {
      if (err) { return callback(err); }
      self.db.get(key, callback);
    });
  };


  Storage.prototype.remove = function (key, callback) {
    var self = this;
    callback = callback || _nope;
    this.init(function(err) {
      if (err) { return callback(err); }
      self.db.remove(key, callback);
    });
  };


  Storage.prototype.clear = function (expiredOnly, callback) {
    var self = this;
    if (_isFunction(expiredOnly)) {
      callback = expiredOnly;
      expiredOnly = false;
    }
    callback = callback || _nope;

    this.init(function(err) {
      if (err) { return callback(err); }
      self.db.clear(expiredOnly, callback);
    });
  };


  //////////////////////////////////////////////////////////////////////////////
  // Bag class implementation

  function Bag(options) {
    if (!(this instanceof Bag)) { return new Bag(options); }

    var self = this;

    options = options || {};

    this.prefix       = options.namespace || 'bag';
    this.timeout      = options.timeout || 20;    // 20 seconds
    this.expire       = options.expire || 30*24;  // 30 days
    this.isValidItem  = options.isValidItem || null;
    
    this.stores = _isArray(options.stores) ? options.stores : ['indexeddb', 'websql', 'localstorage'];

    var storage = null;

    this._createStorage = function () {
      if (!storage) { storage = new Storage(self.prefix, self.stores); }
    };

    function getUrl(url, callback) {
      var xhr = new XMLHttpRequest();
      xhr.open( 'GET', url );
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            callback(null, {
              content: xhr.responseText,
              type: xhr.getResponseHeader('content-type')
            });
            callback = _nope;
          } else {
            callback(new Error(xhr.statusText));
            callback = _nope;
          }
        }
      };


      setTimeout(function () {
        if (xhr.readyState < 4) {
          xhr.abort();
          callback(new Error('Timeout'));
          callback = _nope;
        }
      }, self.timeout * 1000);

      xhr.send();
    }

    function createCacheObj(obj, response) {
      var cacheObj = {};

      _each([ 'url', 'key', 'unique' ], function (key) {
        if (obj[key]) { cacheObj[key] = obj[key]; }
      });

      var now = +new Date();
      cacheObj.data = response.content;
      cacheObj.originalType = response.type;
      cacheObj.type = obj.type || response.type;
      cacheObj.stamp = now;

      return cacheObj;
    }

    function saveUrl(obj, callback) {
      getUrl(obj.url_real, function(err, result) {
        if (err) { return callback(err); }

        var delay = (obj.expire || self.expire) * 60*60; // in seconds

        var cached = createCacheObj(obj, result);

        self.set(obj.key, cached, delay, function() {
          // Don't check error - have to return data anyway
          _default(obj, cached);
          callback(null, obj);
        });
      });
    }


    function isCacheValid(cached, obj) {
      return !cached ||
        cached.expire - +new Date() < 0  ||
        obj.unique !== cached.unique ||
        obj.url !== cached.url ||
        (self.isValidItem && !self.isValidItem(cached, obj));
    }


    function fetch(obj, callback) {

      if (!obj.url) { return callback(); }
      obj.key = (obj.key || obj.url);

      self.get(obj.key, function(err_cache, cached) {

        // Check error only on forced fetch from cache
        if (err_cache && obj.cached) { return callback(err_cache); }

        // if can't get object from store, then just load it from web.
        obj.execute = (obj.execute !== false);
        var shouldFetch = !!err_cache || isCacheValid(cached, obj);

        // If don't have to load new date - return one from cache
        if (!obj.live && !shouldFetch) {
          obj.type = obj.type || cached.originalType;
          _default(obj, cached);
          callback(null, obj);
          return;
        }

        // calculate loading url
        obj.url_real = obj.url;
        if (obj.unique) {
          // set parameter to prevent browser cache
          obj.url_real = obj.url( ( obj.url.indexOf('?') > 0 ) ? '&' : '?' ) + 'bag-unique=' + obj.unique;
        }

        saveUrl(obj, function(err_load) {
          if (err_cache && err_load) { return callback(err_load); }

          if (err_load) {
            obj.type = obj.type || cached.originalType;
            _default(obj, cached);
            callback(null, obj);
            return;
          }

          callback(null, obj);
        });
      });
    }


    var handlers = {
      'application/javascript': function injectScript(obj) {
        var script = document.createElement('script');

        // add script name for dev tools
        var txt = obj.data + '\n//@ sourceURL=' + obj.url;

        // Have to use .text, since we support IE8,
        // which won't allow appending to a script
        script.text = txt;
        head.appendChild(script);
        return;
      },

      'text/css': function injectStyle(obj) {
        var style = document.createElement('style');

        // add style name for dev tools
        var txt = obj.data + '\n/*# sourceURL=' + obj.url + '<url> */';

        if (style.styleSheet) {
          style.styleSheet.cssText = txt; // IE method
        } else {
          style.appendChild(document.createTextNode(txt)); // others
        }

        head.appendChild(style);
        return;
      }
    };


    function execute(obj) {
      // cut off encoding if exists:
      // application/javascript; charset=UTF-8
      if (obj.type && handlers[obj.type.split(';')[0]]) {
        return handlers[obj.type.split(';')[0]](obj);
      }
    }


    //
    // Public methods
    //

    this.require = function(resourses, callback) {
      var res = _isArray(resourses) ? resourses : [resourses];

      // convert string urls to structures
      _each(res, function(r, i) {
        if (_isString(r)) { res[i] = { url: r }; }
      });

      this._createStorage();

      _asyncEach(res, fetch, function(err) {
        if (err) { return callback(err); }

        _each(res, function(obj) {
          if (obj.execute) {
            execute(obj);
          }
        });

        // return content only, if one need fuul info -
        // check input object, that will be extended.
        var replies = [];
        _each(res, function(r) { replies.push(r.data); });

        callback(null, _isArray(resourses) ? replies : replies[0]);
      });
    };


    this.remove = function (key, callback) {
      this._createStorage();
      storage.remove(key, callback);
    };


    this.get = function (key, callback) {
      this._createStorage();
      storage.get(key, callback);
    };


    this.set = function (key, data, expire, callback) {
      this._createStorage();
      storage.set(key, data, expire, callback);
    };


    this.clear = function (expiredOnly, callback) {
      this._createStorage();
      storage.clear(expiredOnly, callback);
    };


    this.addHandler = function (types, handler) {
      types = _isArray(types) ? types : [types];
      _each(types, function (type) { handlers[type] = handler; });
    };


    this.removeHandler = function (types) {
      self.addHandler(types, undefined);
    };
  }


  window.Bag = Bag;

})(this, document);
