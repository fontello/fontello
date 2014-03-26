bag.js - JS / CSS loader + KV storage
-------------------------------------

[![Build Status](https://travis-ci.org/nodeca/bag.js.png?branch=master)](https://travis-ci.org/nodeca/bag.js)

__bag.js__ is loader for js / css aand other files, that uses browser local
stores for caching. Consider it as alternative for other types of loaders for
modern browsers, that reduce number of server requests, especially for mobile
devices. Also __bag.js__  can be used as simple key/value storage, that don't
require you to know details about IndexedDB and WebSQL.

This project is inspired by [basket.js](http://addyosmani.github.io/basket.js/),
but provides more storages for big assets and universal key/value interface.
Key features are:

- Parallel load and sequential execution for JS / CSS and other types of files
- Use IndexedDB / WebSQL / localStorage - good, when you have big assets.
- KV storage for objects, with simple interface.
- No promisses, use callbacks instead, like in node.js
- Simple way to prioritize scripts execution.
- You can use multiple instances with different storage options. For example
  Indexeddb + WebSQL for assets and localStorage for user settings.
- No external dependencies.
- 3.2K when minified+gzipped
- Partial compatibility with [basket.js](http://addyosmani.github.io/basket.js/).

Install via bower:

```
bower install bag.js
```


### Examples

Simple:

``` javascript
var bag = new window.Bag();

bag.require(['/site.css', '/jquery.js', '/site.js'], function (err) {
  if (err) {
    console.log('loading error: ', err);
    return
  }
  // code to run after loading
  // ...
})

```

Advanced:

``` javascript
var bag = new window.Bag({
  prefix: 'my_namespace',
  stores: ['indexeddb', 'websql'],
  timeout: 20000,
  expire: 24
});

bag.isValidItem = function(source, obj) {
  return (source && (source.url === obj.url)) ? true : false;
};

var files = [
  { url: '/site.css', expire: 1 },
  { url: '/jquery.js', expire: 10 },
  { url: '/site.js' },
  { url: '/more_styles.css', expire: 5, execute: false }  
];

bag.require(files, function(err) {
  if (err) {
    console.log('loading error: ', err);
    return
  }
  // code to run after loading
  // ...
})
```

You can skip `new` keyword. Aslo, you can use chained style - when `require`
called without callback, info is just remembered in internal stack:

``` javascript

window.Bag()
  .require('/site.css')
  .require('/jquery.js')
  .require('/site.js')
  .require(function (err, data) {
    if (err) { return console.log('loading error: ', err); }
    // code to run after loading
    // ...
  });
```

Using as key/value storage:

``` javascript
var obj = { lorem: 'ipsum' };
var bag = new window.Bag();

bag.set('dolorem', obj, function(err) {
  if (err) {
    console.log('Saving error: ', err);
    return;
  }
  
  bag.get('dolorem', function(err, data) {
    if (err) {
      console.log('Loading error: ', err);
      return;
    }

    console.log('Loaded data:\n', data);

    bag.remove('dolorem', function(err) {
      if (err) {
        console.log('Removing error: ', err);
        return;
      }

      console.log('Compleete');
    }
  }
});
```

API
---

### new Bag([options])

Object constructor. You can also define options after constructor call, via
instance properties (they have the same names). Options (hash):

- `prefix` - Data namespace. Default - `bag`. Used to separate data for
   multiple instances.
- `stores` - Array of storage names to use, ordered by preference.
  Default `['indexeddb', 'websql', 'localstorage']`.
- `timeout` - files loading timeout, in seconds. Default 20.
- `expire` - `require()` data expiration, in hours. Default - 1 month. 0 or
  unset - don't expire.

Note 1: you can skip `new` keyword, calling `Bag()` will return you new instance anyway.

Note 2: `prefix` must be set before `require`/`get`/`set`/`remove`/`clear` calls. Other options can be changed anytime.

### .require(files [, callback(err, data)])

1. Load files from server or from cache.
2. Inject known types into page (js/css by default), if execution not disabled.
   When multiple files requested (files are `Array`), those are loaded in
   parallel, but injected in defined order.
3. Return result in callback.

`files` param can be:

- `Object` - resource info (see details below).
- `String` - just resource url, other params will be default.
- `Array(Object|String)` - list of resources to load in parallel.

resource info:

- `url` - resource URI, required.
- `expire` - optional, expiration time in hours. 0 or not set - don't expire.
- `key` - the name, used to store loaded file, if not defined, then `url`
   will be used.
- `unique` - a token stored with the cached item. If you request the same item
  again with a different token the script will be fetched and cached again.
- `live` - force cache bypass, for development needs.
- `cached` - force request from cache only.

callback params:

- `err` - error info if loading failed
- `data` - (Array|String) with loaded content, dependong on `files` type. When
  single resource requester (`Object`|`String`), `data` is `String`. When
  `Array` of resourses requested, or chained call done, data is array of strings.

Note, if you pass resources info not in short form, input objects are extended
with loaded data.


### .get(key, callback(err, data))

Load data by `key` name. Return result via callback:

- `err` - error info on fail, null on success
- `data` - loaded object, `undefined` if not exists.


### .set(key, data [, expire] [, callback(err)])

Put data into storage under `key` name.

- `key` - String to address data.
- `data` - JS object to store. We currently support only objects, serializeable
  by JSON. Don't try to put functions or arraybuffers.
- `expire` - Expiration time in seconds. Don't expire by default.
- `callback(err)` - Function to call when compleete. `err` contains error
  on fail.


### .remove(key, callback(err))

Remove `key` data from store. Call `callback` when compleete. If error happens,
error info passed in first callback's param.


### .clear([expiredOnly] [, callback(err)])

Clear all storage data (in your namespace), or just expired objects when called
as `bag.clear(true, ...)`. Callback is optional.


### .addHandler(types, handler)

Add handler for loaded files with specified mime types. By default, handlers
for `application/javascript` and `text/css` already exist. If you set
`execute: false` in resource info, then handler will not be applied.

- `types` - `String` with mime type or `Array` of strings.
- `handler` - function to "execute" file of that type.


### .removeHandler(types)

Remove handler for specified mime type (opposite to `addHandler`).


Related projects
----------------

- [basket.js](http://addyosmani.github.io/basket.js/)
- [PortableCache.js](https://github.com/agektmr/PortableCache.js)
- [Lawnchair](http://brian.io/lawnchair/)
- [LABjs](https://github.com/getify/LABjs)
- [yepnope.js](https://github.com/SlexAxton/yepnope.js)


License
-------

Copyright (c) 2013 [Vitaly Puzrin](https://github.com/puzrin).
Released under the MIT license. See
[LICENSE](https://github.com/nodeca/bag.js/blob/master/LICENSE) for details.
