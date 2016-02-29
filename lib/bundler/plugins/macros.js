'use strict';


const _               = require('lodash');
const async           = require('async');
const DependencyError = require('../utils/dependency_error');

const RULES = [
  /'\$\$([^\r\n]+?)\$\$'/g,
  /"\$\$([^\r\n]+?)\$\$"/g
];


const evaluatorCache = {};


module.exports = function (context, callback) {
  let body = '',
      locals = context.bundler.__helpers__,
      key = Object.keys(locals).toString();

  // create evaluator wrapper
  if (!evaluatorCache.hasOwnProperty(key)) {
    // build function, that allow macro to access `local` keys by name directly.
    Object.keys(locals).forEach(key => {
      body += 'var ' + key + ' = __locals.' + key + ';\n';
    });
    body += 'return eval(data);\n';
    /*eslint-disable no-new-func*/
    evaluatorCache[key] = new Function('data', '__locals', body);
  }

  let evaluated = {};

  // Collect results & possible errors
  RULES.forEach(rule => {
    context.asset.source.replace(rule, function (match, value, offset, orig) {
      try {
        evaluated[value] = evaluatorCache[key](value, locals);
      } catch (e) {
        // Fill error message
        context.__LINE__ = orig.slice(0, offset).split(/\r?\n/).length;
        evaluated[value] = e;
      }
    });
  });

  // If errors are not related to unresolved dependencies - quit.
  let fatalError = _.values(evaluated).some(
    val => val instanceof Error && !(val instanceof DependencyError));

  if (fatalError) {
    let errors = _.values(evaluated).filter(val => !(val instanceof DependencyError));

    callback(`Failed to evaluate macro plugin: ${errors}`);
    return;
  }

  // Additional dependencies from macros to resolve
  let newDeps = _.values(evaluated)
                 .filter(val => val instanceof DependencyError)
                 .map(val => val.dependency);

  // Resolve collected deps
  async.each(newDeps, (dep, cb) => context.bundler.findAsset(dep).resolve(cb), err => {
    if (err) {
      callback(err);
      return;
    }

    // Track deps
    newDeps.forEach(dep => context.asset.dependOnAsset(context.bundler.findAsset(dep)));

    // Finally, do replacements
    RULES.forEach(rule => {
      context.asset.source = context.asset.source.replace(rule, function (match, value, offset, orig) {
        try {
          // Don't evaluate simple values twice
          if (!(evaluated[value] instanceof DependencyError)) {
            return evaluated[value];
          }
          return evaluatorCache[key](value, locals);
        } catch (e) {
          // Fill error message
          context.__LINE__ = orig.slice(0, offset).split(/\r?\n/).length;
          throw new Error(`Failed to evaluate macro ${value.trim()} [${e.message}]`);
        }
      });
    });

    callback();
  });
};
