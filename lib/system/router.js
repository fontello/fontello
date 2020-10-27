// Extend Pointer class to add querystring parsing and formatting
//

'use strict';


const _           = require('lodash');
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
    if (result && result.params && !result.params.$query) {
      result.params.$query = querystring.parse(query);
    }
  }

  if (anchor) {
    if (result && result.params && !result.params.$anchor) {
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
      if (result && result.params && !result.params.$query) {
        result.params.$query = querystring.parse(query);
      }
    });
  }

  if (anchor) {
    results.forEach(result => {
      if (result && result.params && !result.params.$anchor) {
        result.params.$anchor = anchor;
      }
    });
  }

  return results;
};


Router.prototype.linkTo = function (apiPath, params, linkDefaults) {
  let query, anchor;

  if (params && (params.$query || params.$anchor)) {
    query  = _.omitBy(params.$query || {}, _.isNil);
    anchor = params.$anchor;
    params = _.omit(params, [ '$query', '$anchor' ]);
  }

  let result = Pointer.prototype.linkTo.call(this, apiPath, params, linkDefaults);

  if (!_.isEmpty(query)) {
    result += '?' + querystring.stringify(query);
  }

  if (anchor) {
    result += '#' + anchor;
  }

  return result;
};


module.exports = Router;
