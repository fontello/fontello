'use strict';


const path  = require('path');
const glob  = require('glob').sync;


module.exports = function loadFilters(N) {
  let rootDir = path.join(__dirname, 'autoload');

  glob('**/*.js', {
    cwd: rootDir
  })
  .filter(name => !/^[._]|\\[._]|\/[_.]/.test(name))
  .forEach(name => require(path.join(rootDir, name))(N));
};
