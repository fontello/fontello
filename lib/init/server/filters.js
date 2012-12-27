// Applies server method filters


'use strict';


// stdlib
var path  = require('path');
var fs    = require('fs');


////////////////////////////////////////////////////////////////////////////////


fs.readdirSync(path.join(__dirname, 'filters')).forEach(function (file) {
  if ('.js' === path.extname(file)) {
    require(path.join(__dirname, 'filters', file));
  }
});
