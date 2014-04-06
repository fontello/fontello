// `client` section processor
//


'use strict';


// stdlib
var fs    = require('fs');
var path  = require('path');


// 3rd-party
var _            = require('lodash');
var fstools      = require('fs-tools');
var findRequires = require('find-requires');


// internal
var stopwatch         = require('../utils/stopwatch');
var resolveModulePath = require('./utils/resolve_module_path');
var findPaths         = require('./utils/find_paths');


////////////////////////////////////////////////////////////////////////////////

// wrapper for client's module (widget)
var WRAPPER_WIDGET_TEMPLATE_PATH = path.join(__dirname, 'client', 'wrapper_widget.tpl');
var WRAPPER_WIDGET_TEMPLATE = _.template(fs.readFileSync(WRAPPER_WIDGET_TEMPLATE_PATH, 'utf8'));

// wrapper for common.js module
var WRAPPER_REQUIRE_TEMPLATE_PATH = path.join(__dirname, 'client', 'wrapper_require.tpl');
var WRAPPER_REQUIRE_TEMPLATE = _.template(fs.readFileSync(WRAPPER_REQUIRE_TEMPLATE_PATH, 'utf8'));

// wrapper for alias to common.js module
var WRAPPER_ALIAS_TEMPLATE_PATH = path.join(__dirname, 'client', 'wrapper_alias.tpl');
var WRAPPER_ALIAS_TEMPLATE = _.template(fs.readFileSync(WRAPPER_ALIAS_TEMPLATE_PATH, 'utf8'));


var vendorModules; // Bundled vendor files paths (should be embedded only once)
var clientModules; // Global list if wiget's JS - 'not requireable'
var vendorVirtualModules; //  { Alias name -> file path }
var embeddedModulesPaths; // { pgkName -> { paths: true }}

////////////////////////////////////////////////////////////////////////////////


/*
 * Wraps the given source code string as a module definition for the client.
 * Recursively browserifies and embeds all of unbundled dependencies.
 *
 * options:
 *
 * - wrapper  - src wrapper (client/require), or empty (for main.js)
 * - apiPath  - api path, for flient only
 * - fsPath   - current file name
 * - allowEJS - used only for `main.js`, to inject some variables in <file>.js.ejs
 */
function browserifySingle(sandbox, pkgName, source, options) {
  var result       = []
    , wrapper      = options.wrapper
    , apiPath      = options.apiPath     || null
    , filePath     = options.fsPath
    , directory    = path.dirname(filePath)
    , root         = sandbox.N.runtime.mainApp.root;

  if (!filePath) {
    throw new Error('Missed required `fsPath` argument.');
  }


  // Find & reqursuvely process `require` directives
  //
  findRequires(source, { raw: true }).forEach(function (match) {
    var resolvedPath, dependencySource;

    // `require` path cannot be determinated - throw error.
    if (!match.value) {
      throw new Error('Error in \'require\': file \'' + filePath + '\', string ' + match.line + '.');
    }

    if (vendorVirtualModules[match.value]) {
      // Get path to a virtual module.
      resolvedPath = vendorVirtualModules[match.value];
    } else {
      // Resolve absolute, relative, or node-module path.
      resolvedPath = resolveModulePath(directory, match.value);
    }

    if (!resolvedPath) {
      throw 'Bundler cannot find required file "' + match.value + '" ' +
            'at ' + filePath + ':' + match.point + ':' + match.line;
    }

    if (_.has(clientModules, resolvedPath)) {
      throw 'Require of client block "' + match.value + '" is prohibited ' +
            'at ' + filePath + ':' + match.point + ':' + match.line;
    }

    // Note: This is not actually safe way to replace `require` paths, but
    // alternative ways seem be too complicated. In real live that should
    // work without problems.
    source = source.replace(match.raw, JSON.stringify(path.relative(root, resolvedPath)));

    // Embed private local modules. (not described in the bundle config and
    // not embedded yet)
    if (!_.has(vendorModules, resolvedPath) &&
        !_.has(embeddedModulesPaths[pkgName], resolvedPath)) {

      embeddedModulesPaths[pkgName] = embeddedModulesPaths[pkgName] || {};
      embeddedModulesPaths[pkgName][resolvedPath] = true;

      // `required` files in vendor modules must be marked as vendor's too
      if (_.has(vendorModules, filePath)) {
        vendorModules[resolvedPath] = true;
      }
      dependencySource = fs.readFileSync(resolvedPath, 'utf8');

      // Recursively browserify
      result.push(browserifySingle(sandbox, pkgName, dependencySource, {
        wrapper:      WRAPPER_REQUIRE_TEMPLATE
      , fsPath:       resolvedPath
      }));
    }
  });

  if (wrapper) {
    source = wrapper({
      path: path.relative(root, filePath),
      apiPath: apiPath,
      source:  source
    });
  }

  result.push(source);

  return result.join('\n');
}


// Wraps all of the given files for in-browser use and writes the result into
// the destination filepath. `files` should be an array of Pathname objects
// taken from `client` section of a package.
function browserifyFiles(sandbox, pkgName, lookup, destination) {
  var result     = [];

  // Write module definitions.
  findPaths(lookup, function (fsPath, apiPath) {
    result.push(browserifySingle(sandbox, pkgName, fs.readFileSync(fsPath, 'utf8'), {
      wrapper:      WRAPPER_WIDGET_TEMPLATE
    , fsPath:       fsPath
    , apiPath:      apiPath
    }));
  });

  // Write the result to the destination.
  fstools.mkdirSync(path.dirname(destination));
  fs.writeFileSync(destination, result.join('\n'), 'utf8');
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var N      = sandbox.N
    , timer  = stopwatch()
    , tmpdir = sandbox.tmpdir
    , root   = N.runtime.mainApp.root;


  //
  // Collect flat lists of all `vendor` and `client` files from all packages.
  //

  vendorModules = {};
  clientModules = {};
  vendorVirtualModules = {};
  embeddedModulesPaths = {};

  _.forEach(sandbox.config.packages, function (pkg) {
    _.forEach(pkg.vendor[''], function (filePath) {
      vendorModules[filePath] = true;
    });
  });

  _.forEach(sandbox.config.packages, function (pkg) {
    findPaths(pkg.client, function (filePath) {
      clientModules[filePath] = true;
    });
  });

  _.forEach(sandbox.config.packages, function (pkg) {
    _.forEach(pkg.vendor, function (filePath, name) {
      if (name) {
        vendorVirtualModules[name] = filePath;
      }
    });
  });


  //
  // Build vendor files for each package
  //

  _.forEach(sandbox.config.packages, function (pkgConfig, pkgName) {
    var outfile = path.join(sandbox.tmpdir, 'vendor', pkgName + '.js')
      , result  = [];

    _.forEach(pkgConfig.vendor[''], function (fsPath) {

      result.push(browserifySingle(sandbox, pkgName, fs.readFileSync(fsPath, 'utf8'), {
          wrapper:      WRAPPER_REQUIRE_TEMPLATE
        , fsPath:       fsPath
        }));
    });

    _.forEach(pkgConfig.vendor, function (file, name) {
      if (name === '') { return; }
      result.push(WRAPPER_ALIAS_TEMPLATE({
        name: name,
        path: path.relative(root, file)
      }));
    });

    fstools.mkdirSync(path.dirname(outfile));
    fs.writeFileSync(outfile, result.join('\n'), 'utf8');
  });

  N.logger.info('Processed vendor section %s', timer.elapsed);
  timer  = stopwatch();


  //
  // Build client files for each package
  //

  _.keys(sandbox.config.packages).forEach(function (pkgName) {
    var clientConfig = sandbox.config.packages[pkgName].client
      , mainLookup   = null
      , resultFile   = path.join(tmpdir, 'client', pkgName + '.js')
      , clientTmpDir = path.join(tmpdir, 'client', pkgName)
      , mainFile     = path.join(clientTmpDir, 'main.js')
      , modulesFile  = path.join(clientTmpDir, 'client.js')
      , targetFile   = null // mainFile if exists; modulesFile otherwise.
      , environment  = sandbox.assets.environment
      , originPaths  = environment.paths // to restore it later
      , timer        = stopwatch();

    if (_.isEmpty(clientConfig)) {
      return;
    }

    mainLookup = _.find(clientConfig, 'main');

    if (mainLookup) {
      var tmp = fs.readFileSync(path.resolve(mainLookup.root, mainLookup.main));
      fstools.mkdirSync(path.dirname(mainFile));
      fs.writeFileSync(mainFile, tmp);
      targetFile = mainFile;
    } else {
      targetFile = modulesFile;
    }

    browserifyFiles(sandbox, pkgName, clientConfig, modulesFile);

    // Prepend path with `modulesFile` to allow use
    //
    //    //= require client
    //
    // in main file.
    environment.prependPath(clientTmpDir);

    // When Mincer is asked for a main file, it must be within roots, that
    // Mincer knows about. See: https://github.com/nodeca/mincer/issues/51
    clientConfig.forEach(function (options) {
      environment.appendPath(options.root);
    });

    // Find & build asset
    var asset = environment.findAsset(targetFile);

    // Check that main file is requirable.
    if (!asset) {
      // Restore Mincer's paths.
      environment.clearPaths();
      environment.appendPath(originPaths);

      throw new Error('Main client file of ' + pkgName + ' not found: ' + targetFile);
    }

    var source = asset.buffer.toString();

    fs.writeFileSync(resultFile, source, 'utf8');

    // Restore Mincer's paths.
    environment.clearPaths();
    environment.appendPath(originPaths);

    N.logger.debug('Compiled client of %s %s', pkgName, timer.elapsed);
    fstools.removeSync(clientTmpDir);
  });

  N.logger.info('Processed client section %s', timer.elapsed);
};
