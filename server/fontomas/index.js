/*global nodeca*/

"use strict";

module.exports = function app(params, callback) {
  this.response.view = 'layout';
  callback();
};
