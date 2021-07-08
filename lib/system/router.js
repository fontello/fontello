// Extend Pointer class to add querystring parsing and formatting
//

'use strict';


const Pointer     = require('pointer');
const querystring = require('querystring');


function Router(...args) {
  if (!(this instanceof Router)) return new Router(...args);

  Pointer.apply(this, args);
}

// Inherit from Pointer
Router.prototype = Object.create(Pointer.prototype);
Router.prototype.constructor = Pointer;


Router.prototype.match = function (url) {
  let [ , urlpath, query, anchor ] = url.match(/^([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/);
  let result = Pointer.prototype.match.call(this, urlpath);

  if (query) {
    if (result?.params && !result.params?.$query) {
      result.params.$query = querystring.parse(query);
    }
  }

  if (anchor) {
    if (result?.params && !result.params.$anchor) {
      result.params.$anchor = anchor;
    }
  }

  return result;
};


Router.prototype.matchAll = function (url) {
  let [ , urlpath, query, anchor ] = url.match(/^([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/);
  let results = Pointer.prototype.matchAll.call(this, urlpath);

  if (query) {
    results.forEach(result => {
      if (result?.params && !result.params.$query) {
        result.params.$query = querystring.parse(query);
      }
    });
  }

  if (anchor) {
    results.forEach(result => {
      if (result?.params && !result.params.$anchor) {
        result.params.$anchor = anchor;
      }
    });
  }

  return results;
};


Router.prototype.linkTo = function (apiPath, fullParams = {}, linkDefaults = {}) {
  let { $query: query = {}, $anchor: anchor = '', ...params } = fullParams;

  for (let k of Object.keys(query)) {
    if (typeof query[k] === 'undefined' || query[k] === null) delete query[k];
  }

  let result = Pointer.prototype.linkTo.call(this, apiPath, params, linkDefaults);

  if (Object.keys(query).length) {
    result += '?' + querystring.stringify(query);
  }

  if (anchor) {
    result += '#' + anchor;
  }

  return result;
};


module.exports = Router;
