// JADE view compiler
//


'use strict';


// stdlib
var dirname   = require('path').dirname;
var basename  = require('path').basename;
var resolve   = require('path').resolve;
var fs        = require('fs');


// 3rd-party
var _     = require('lodash');
var jade  = require('jade');


////////////////////////////////////////////////////////////////////////////////


// Monkey-patch Parser#parseInclude to allow replace @ with app root
// via `filterPath` compiler option
jade.Parser.prototype.parseInclude = function () {
  var
  path    = this.expect('include').val.trim(),
  dir     = dirname(this.filename),
  str     = '',
  parser  = null,
  ast     = null;

  if (!this.filename) {
    throw new Error('the "filename" option is required to use includes');
  }

  // allow on-fly path manipualtion
  if (this.options.filterPath) {
    path = this.options.filterPath(path);
  }

  // no extension
  if (-1 === basename(path).indexOf('.')) {
    path += '.jade';
  }

  // non-jade
  if ('.jade' !== path.substr(-5)) {
    // using resolve instead of join - to propely handle "absolute" paths
    path  = resolve(dir, path);
    str   = fs.readFileSync(path, 'utf8');

    return new jade.nodes.Literal(str);
  }

  // using resolve instead of join - to propely handle "absolute" paths
  path    = resolve(dir, path);
  str     = fs.readFileSync(path, 'utf8');
  parser  = new jade.Parser(str, path, this.options);

  parser.blocks = this.blocks;
  parser.mixins = this.mixins;

  this.context(parser);

  ast = parser.parse();

  this.context();

  ast.filename = path;

  if ('indent' === this.peek().type) {
    ast.includeBlock().push(this.block());
  }

  return ast;
};


////////////////////////////////////////////////////////////////////////////////


exports.server = function (string, options) {
  return jade.compile(string, _.extend({}, options, {
    // debug decrease speed and disable external cache
    // (injects unique paths every time, because of random tml dir)
    compileDebug: false
    // NO `with` -> better speed
  , self:         true
    // Set HTML5 mode, for terse attributes (boolean + without params)
  , doctype:      '5'
  , client:       false
  }));
};


exports.client = function (string, options) {
  return jade.compile(string, _.extend({}, options, {
    // debug decrease speed and disable external cache
    // (injects unique paths every time, because of random tml dir)
    compileDebug: false
    // NO `with` -> better speed
  , self:         true
    // Set HTML5 mode, for terse attributes (boolean + without params)
  , doctype:      '5'
  , client:       true
  })).toString();
};
