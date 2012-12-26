'use strict';


////////////////////////////////////////////////////////////////////////////////


// Each engine is registered by it's extname and exports:
//
// * server(str, options, callback(err, func))
//   - `func` (Function) is a renderer function
//
// * client(str, options, callback(err, tmpl))
//   - `tmpl` (String) is a client-side renderer function source
//
// In both cases `str` is a string with view template and `options` is an object
// with following properties:
//
// * `filename` (String): Pathname of a file `str` was read from


////////////////////////////////////////////////////////////////////////////////


module.exports['.ejs']  = require('./engines/ejs');
module.exports['.html'] = require('./engines/html');
module.exports['.jade'] = require('./engines/jade');
