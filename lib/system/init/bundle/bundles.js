// Concats js/css resources per-bundle
//
//  - js packages (vendor, views, client)
//  - css packages
//  - languages
//


'use strict';


// stdlib
var fs      = require('fs');
var path    = require('path');
var format  = require('util').format;


// 3rd-party
var _       = require('lodash');
var fstools = require('fs-tools');


// internal
var stopwatch = require('../utils/stopwatch');


////////////////////////////////////////////////////////////////////////////////


// Returns package styesheet string
//
function readPackageStylesheet(pkgName, sandbox) {
  var filename = path.join(sandbox.tmpdir, 'styles', pkgName + '.css');
  return fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
}


// Returns map of { <locale> : <source>, ... }
//
function readPackageJavascripts(pkgName, sandbox, withLocales) {
  var data = { '*' : '' }
    , tmpdir = sandbox.tmpdir
    , N = sandbox.N;

  //
  // join locale-independent data
  //

  [ 'vendor', 'views', 'client' ].forEach(function (part) {
    var filename = path.join(tmpdir, part, pkgName + '.js');

    if (fs.existsSync(filename)) {
      data['*'] += ';' + fs.readFileSync(filename, 'utf8');
    }
  });

  //
  // prepare localized data if required
  //

  if (withLocales) {
    N.config.locales.enabled.forEach(function (locale) {
      var filename = path.join(tmpdir, 'i18n', pkgName, locale + '.js');

      if (fs.existsSync(filename)) {
        data[locale] = data['*'] + ';' + fs.readFileSync(filename, 'utf8');
      }
    });
  }

  return data;
}


// Reads stylesheets and javascripts for each package. Concatenate javascripts
// per-language if needed.
//
// Returns hash with package -> assets:
//
//    {
//      forum: {
//        stylesheet: <String>,
//        javascripts: {
//          "en-US": <String>,
//          ...
//        }
//      },
//
//      lib: {
//        stylesheet: <String>,
//        javascripts: {
//          "*": <String>
//        }
//      },
//
//      ...
//    }
//
function concatFilesPerPackage(sandbox) {
  var assets = {};

  _.keys(sandbox.config.packages).forEach(function (pkgName) {
    var withLocales = _.contains(sandbox.clientI18nPackages, pkgName);

    assets[pkgName] = {
      stylesheet:   readPackageStylesheet(pkgName, sandbox),
      javascripts:  readPackageJavascripts(pkgName, sandbox, withLocales)
    };
  });

  return assets;
}


// Concat builded stylesheets from different packages and writes bundled
// stylesheet if it's non-empty
//
function writeBundleStylesheet(bndlName, sandbox, assets) {
  var stylesheet  = ''
    , filename    = path.join(sandbox.tmpdir, 'bundle', 'bundle-' + bndlName + '.css');

  _.each(assets, function (data) {
    stylesheet += data.stylesheet;
  });

  if (!stylesheet) {
    return null;
  }

  fs.writeFileSync(filename, stylesheet, 'utf8');
  return filename;
}


// Concat all javascripts per-bundle / locale
//
function writeBundleJavascripts(bndlName, sandbox, assets) {
  var withLocales = _.any(assets, function (data) {
        // data always contains at least one key `*`.
        // if it has more than one key, then it contains locales
        return data.javascripts && 1 < _.keys(data.javascripts).length;
      })
    , N = sandbox.N
    , tmpdir = sandbox.tmpdir;

  function writeFile(locale) {
    var
    javascript  = '',
    suffix      = (locale ? ('.' + locale) : '') + '.js',
    filename    = path.join(tmpdir, 'bundle', 'bundle-' + bndlName + suffix);

    _.each(assets, function (data) {
      javascript += data.javascripts[locale] || data.javascripts['*'] || '';
    });

    if (!javascript) {
      return null;
    }

    fs.writeFileSync(filename, javascript, 'utf8');
    return filename;
  }

  var data = {};

  if (!withLocales) {
    data['*'] = writeFile();
  } else {
    N.config.locales.enabled.forEach(function (locale) {
      data[locale] = writeFile(locale);
    });
  }

  return data;
}


// Write bundle files
//
//    bundle/<name>.css
//    bundle/<name>.<locale>.js
//
function writeAssetsPerBundle(sandbox, assets) {
  var data = {};

  _.each(sandbox.config.bundles, function (packages, bndlName) {
    var bndlAssets = _.pick(assets, packages);

    data[bndlName] = {
      stylesheet:   writeBundleStylesheet(bndlName, sandbox, bndlAssets),
      javascripts:  writeBundleJavascripts(bndlName, sandbox, bndlAssets)
    };
  });

  return data;
}


// Walks over all packages in the given distibution and composes queues of
// packages and stylesheets on each.
//
// The resulting package queues are full lists of packages are needed to load in
// order to load the given package. In the exact order. These include also the
// concerned package ifself at the last position.
//
// The resulting stylesheet queues are intended to use in the view layouts for
// linking initial page stylesheets.
//
function composeLoadingQueues(sandbox, distribution) {
  _.each(distribution, function (localeDist) {
    _.each(localeDist, function (pkgDist, pkgName) {
      var packagesQueue = []
        , stylesQueue  = [];

      // This function is used to recursively populate the loading queue.
      function processPackage(processPkgName) {
        var processPkgConfig = sandbox.config.packages[processPkgName];

        // Yield dependences of the current package first.
        if (processPkgConfig.depends) {
          processPkgConfig.depends.forEach(function (dependency) {
            if (-1 === packagesQueue.indexOf(dependency)) {
              processPackage(dependency);
            }
          });
        }

        // Yield the current package itself at the last.
        packagesQueue.push(processPkgName);
      }

      // Compose the loading queue.
      processPackage(pkgName);

      // Compose the styles queue.
      packagesQueue.forEach(function (depName) {
        var depDist = localeDist[depName];

        if (depDist && depDist.stylesheet) {
          if (-1 === stylesQueue.indexOf(depDist.stylesheet)) {
            stylesQueue.push(depDist.stylesheet);
          }
        }
      });

      // Expose the queues to the package distribution.
      pkgDist.packagesQueue = packagesQueue;
      pkgDist.stylesQueue   = stylesQueue;
    });
  });
}


// Returns assets distribution map that will be used by loader
//
//    <locale>:
//      <pkgName>:
//        stylesheets:
//          - <file>
//          - ...
//        javascripts:
//          - <file>
//          - ...
//
function createLoaderPkgsMap(sandbox, bundleAssets) {
  var // map of { <packageName>: <bundleName>, ... }
      pkgBundle = {}
      // map of { <packageName>: { <locale>: { <assets> }, ... } }
    , distribution = {}
    , N = sandbox.N;

  //
  // get bundles list
  //

  _.each(sandbox.config.bundles, function (packages, bndlName) {
    _.each(packages, function (pkgName) {
      pkgBundle[pkgName] = bndlName;
    });
  });

  //
  // collect assets for each package, per locale
  //

  // memoized mincer's find_sssets
  var findAsset = _.memoize(function(path) {
    var timer = stopwatch();
    var asset = sandbox.assets.environment.findAsset(path);

    N.logger.debug('Created asset %s %s', path, timer.elapsed);
    return asset;
  });

  N.config.locales.enabled.forEach(function (locale) {
    distribution[locale] = {};

    _.keys(sandbox.config.packages).forEach(function (pkgName) {
      var assets, stylesheet, javascript;

      assets = bundleAssets[pkgBundle[pkgName]];

      if(!assets) {
        throw new Error(format(
              'Package `%s` defined, but not assigned to any bundle, ' +
              'check `bundle.yml` in appropriate application root', pkgName));
      }

      distribution[locale][pkgName] = {
        packagesQueue: null,
        stylesQueue:   null,
        stylesheet:    null,
        javascript:    null
      };

      stylesheet = assets.stylesheet;
      javascript = assets.javascripts[locale] || assets.javascripts['*'];

      if (stylesheet) {
        // generates bundle here
        stylesheet = findAsset(stylesheet);

        distribution[locale][pkgName].stylesheet = stylesheet.logicalPath;
        sandbox.assets.files.push(stylesheet.logicalPath);
      }

      if (javascript) {
        // generates bundle here
        javascript = findAsset(javascript);

        distribution[locale][pkgName].javascript = javascript.logicalPath;
        sandbox.assets.files.push(javascript.logicalPath);
      }
    });
  });

  return distribution;
}


////////////////////////////////////////////////////////////////////////////////


module.exports = function (sandbox) {
  var timer   = stopwatch()
    , N       = sandbox.N
    , bndlDir = path.join(sandbox.tmpdir, 'bundle')
    , compiledPkgs
    , compiledBndls;

  // XXX Set Mincer compression here, to avoid double compression on creating
  //     package files (client.js).
  if ('development' !== N.runtime.env && process.env.NODECA_NOMINIFY !== '1') {
    sandbox.assets.environment.jsCompressor  = 'uglify';
    sandbox.assets.environment.cssCompressor = 'csswring';
  }

  fstools.mkdirSync(bndlDir);
  compiledPkgs  = concatFilesPerPackage(sandbox);
  compiledBndls = writeAssetsPerBundle(sandbox, compiledPkgs);

  sandbox.assets.environment.appendPath(bndlDir);

  // Mincer called here, to create final bundles (assets)
  sandbox.assets.distribution = createLoaderPkgsMap(sandbox, compiledBndls);
  composeLoadingQueues(sandbox, sandbox.assets.distribution);

  N.logger.info('Created bundles & loading map %s', timer.elapsed);
};
