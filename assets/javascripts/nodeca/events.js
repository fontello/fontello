//= require EventEmitter


"use strict";


/*global nodeca, EventEmitter*/


nodeca.events = new EventEmitter();


nodeca.events.once = function (evt, listener) {
  var self = this, real;

  real = function () {
    self.off(evt, real);
    return listener.apply(this, arguments);
  };

  this.on(evt, real);
};
