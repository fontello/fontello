// Prepares request environment (`this` context of server methods/filters).


'use strict';


const Puncher = require('puncher');


////////////////////////////////////////////////////////////////////////////////


// Resolve full phrase path
//
function resolveI18nPath(path, _self) {
  if (path.charAt(0) === '@') {
    // absolute
    return path.slice(1);
  }
  // relative
  return _self.method + '.' + path;
}


////////////////////////////////////////////////////////////////////////////////
// Env helpers

let DEFAULT_INIT_HANDLERS = [];
let DEFAULT_CLONE_HANDLERS = [];

let DEFAULT_HELPERS = {
  // Server and render helper closures.
  //
  set_layout: function set_layout_helper(layout) {
    this.res.layout = layout;
  },

  link_to: function link_to_helper(name, params) {
    return this.__N.router.linkTo(name, params) || '#';
  },

  asset_url: function asset_url_helper(path) {
    return this.__N.assets.asset_url(path);
  },

  asset_body: function asset_body_helper(path) {
    return this.__N.assets.asset_body(path);
  },

  // ---------------------------------------------------------------------------
  // It's common to override this helpers. For example to take locale from
  // `env.current_user`, to don't touch `env.runtime`. That can be convenient if
  // you need to quickly subcall another server method with cloned env directly
  // (without wrappers).
  t: function translate_helper(/*phrase, params*/) {
    throw new Error('`env.helpers.t` hook should be overridden');
  },

  t_exists: function translate_exists_helper(/*phrase*/) {
    throw new Error('`env.helpers.t_exists` hook should be overridden');
  },
  // ---------------------------------------------------------------------------

  add_raw_data: function add_raw_data_helper(key, data) {
    if (this.runtime.page_data.hasOwnProperty(key)) {
      this.__N.logger.warn('Override of %j key in env.runtime.page_data', key);
    }

    this.runtime.page_data[key] = data;
  }
};


////////////////////////////////////////////////////////////////////////////////

/**
 *  lib.env(options) -> Object
 *  - options (Object): Environment options.
 *
 *  Create new request environment object.
 *
 *
 *  ##### Options
 *
 *  - **type**: Request type
 *  - **isEncrypted**: Is https (Boolean)
 *  - **params**: Request params
 *  - **session**: Session object
 *  - **matched**: Router metadata
 *  - **remoteAddress**: original IP (in direct & forwarded mode)
 **/
function Env(N, options) {
  // Private, for helpers
  this.__N = N;

  this.params   = options.params || {};
  this.method   = null;

  // Contains server chain response on success
  this.data     = {};

  // internal, to pass error from server chain to responders
  this.err      = null;
  // internal, rendered data
  this.body     = null;
  // internal, http status code (set in responders)
  this.status   = N.io.OK;

  this.headers  = {};


  this.runtime  = {
    assets_hash: N.assets_hash,
    page_data:   {}
  };

  let puncher = new Puncher();
  puncher.start('Total');

  this.extras   = { puncher };

  this.origin   = {
    req: options.req,
    res: options.res
  };

  this.session  = options.session || null;

  this.req      = {
    type:        options.type,
    isEncrypted: options.isEncrypted,
    ip:          options.remoteAddress,
    matched:     options.matched || null,
    tzOffset:    new Date().getTimezoneOffset(), // use server tz by default
    files:       {}, // uploaded files, fieldName => [ { name, size, path, ... } ]
    fields:      {}  // form fields if sent via HTTP POST
  };

  this.res      = {
    head: {
      title: null, // should be filled with default value

      // List of assets for loader,
      // Each element is an object with properties:
      //
      //    type:   css|js
      //    link:   asset_url
      //
      // example: assets.push({type: 'js', link: '//example.com/foo.js'});
      assets: []
    },
    menus: {}
  };

  // Pin helpers (those are shared with server methods and renderer)
  //
  this.helpers  = {};

  Object.keys(DEFAULT_HELPERS).forEach(h => {
    this.helpers[h] = DEFAULT_HELPERS[h].bind(this);
  });

  // TODO: remove this alias
  this.helpers.t.exists = phrase => this.helpers.t_exists(phrase);

  // Server-only helper closures.
  //
  this.t = (phrase, params) => this.helpers.t(resolveI18nPath(phrase, this), params);

  this.t.exists = phrase => this.helpers.t_exists(resolveI18nPath(phrase, this));

  // Run initializers for complex things (nested properties).
  // For example - settings, cookies
  //
  DEFAULT_INIT_HANDLERS.forEach(handler => handler(this));
}


// TODO: not needed anymore, but probably can be useful in client requests combiner.
// cleanup later.
Env.prototype.clone = function () {
  let env      = new Env(this.__N, {});

  env.origin   = this.origin;
  env.session  = this.session;
  env.req      = this.req;

  // Run custom functions to clone additional
  // env properties (e.g. env.user_info).
  //
  DEFAULT_CLONE_HANDLERS.forEach(handler => handler(env, this));

  return env;
};


////////////////////////////////////////////////////////////////////////////////

module.exports = function createEnv(N, options) {
  return new Env(N, options);
};

// for modifications
module.exports.helpers       = DEFAULT_HELPERS;        // mixed to env & renderer
module.exports.initHandlers  = DEFAULT_INIT_HANDLERS;  // executed on `new`
module.exports.cloneHandlers = DEFAULT_CLONE_HANDLERS; // executed on `clone`
