'use strict';


const resolve = require('resolve');
const path    = require('path');


function npmResolverPlugin() {
  return {
    resolve(filename, source /*, options */) {
      return resolve.sync(filename, { basedir: path.dirname(source) });
    }
  };
}


module.exports = async function (context) {

  const pug = require('pug');

  let tpl = pug.compileClient(context.asset.source, {
    compileDebug:           false,
    doctype:                'html',
    filename:               context.asset.logicalPath,
    inlineRuntimeFunctions: false,
    plugins:                [ npmResolverPlugin() ],
    self:                   true
  }).toString();

  context.asset.source = tpl;
};
