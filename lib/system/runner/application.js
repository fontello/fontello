// Base structure of (sub-)application. Holds root, name and version of ana
// application. In future will also hold init() function that wil be called
// upon runner's applications init stage.


'use strict';


const load_app_config = require('../init/bundle/utils/load_app_config');


////////////////////////////////////////////////////////////////////////////////


function Application(options) {
  this.root     = options.root;
  this.name     = options.name;
  this.config   = load_app_config(options.root);

  this.init     = options.init || function () {};
}


////////////////////////////////////////////////////////////////////////////////


module.exports = Application;
