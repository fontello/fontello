// Extend Pointer class to add querystring parsing and formatting
//

'use strict';


const _           = require('lodash');
const Pointer     = require('pointer');
const querystring = require('querystring');
const util        = require('util');


function Router(...args) {
  if (!(this instanceof Router)) return new Router(...args);

  Pointer.apply(this, args);
}

util.inherits(Router, Pointer);


Router.prototype.match = function (url) {
  let [ urlpath, query ] = url.split('?', 2);
  let result = Pointer.prototype.match.call(this, urlpath);

  if (query) {
    if (result && result.params && !result.params.$query) {
      result.params.$query = querystring.parse(query);
    }
  }

  return result;
};


Router.prototype.matchAll = function (url) {
  let [ urlpath, query ] = url.split('?', 2);
  let results = Pointer.prototype.matchAll.call(this, urlpath);

  if (query) {
    results.forEach(result => {
      if (result && result.params && !result.params.$query) {
        result.params.$query = querystring.parse(query);
      }
    });
  }

  return results;
};


Router.prototype.linkTo = function (apiPath, params, linkDefaults) {
  let query;

  if (params && params.$query) {
    query = params.$query;
    params = _.omit(params, '$query');
  }

  let result = Pointer.prototype.linkTo.call(this, apiPath, params, linkDefaults);

  if (!_.isEmpty(query)) {
    result += '?' + querystring.stringify(query);
  }

  return result;
};


module.exports = Router;
