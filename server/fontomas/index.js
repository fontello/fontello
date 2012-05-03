/*global nodeca*/

"use strict";

module.exports = function app(params, callback) {
  this.response.view = 'layout';
  this.response.headers['Cache-Control'] = 'private, maxage=0';
  callback();
};
