// Check that client scripts are transpiled to ES5 and no ES6 code left
//
'use strict';


const _       = require('lodash');
const acorn   = require('acorn');
const join    = require('path').join;
const fs      = require('fs');


describe('Client files should be transpiled to ES5', function () {
  let script_paths = _.filter(
    TEST.N.assets.files,
    a => /^public\//.test(a.digestPath) && /[.]js$/.test(a.digestPath)
  )
  .map(a => join(TEST.N.mainApp.root, 'assets', a.digestPath));

  script_paths.forEach(p => {
    it(`Check file ${p}`, function () {
      acorn.parse(
        fs.readFileSync(p, 'utf-8'),
        { ecmaVersion: 5 }
      );
    });
  });

});
