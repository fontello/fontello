'use strict';


const _       = require('lodash');
const fs      = require('fs');
const path    = require('path');
const yaml    = require('js-yaml');
const glob    = require('glob').sync;
const cached  = require('./fs_cached');
//  Alternative to node's `require.resolve`, with ability to define root path
//  + memoise, that boosts speed
const resolve = _.memoize(require('resolve').sync, JSON.stringify);


// Resolve module path
//
function resolve_module_path(fromRoot, toFile) {
  let first = toFile.split(/[\/\\]/)[0];

  if (first === '.' || first === '..') {
    toFile = path.resolve(fromRoot, toFile);
  }

  try {
    return resolve(toFile, { basedir: fromRoot });
  } catch (err) {
    return null;
  }
}



// Returns normalized version of vendor section of a package definition.
// Resolves all file paths relative to `app.root` using `resolveModulePath`.
//
// NOTE: Normalized vendor section is different from the config origin.
//
// Config:
//
// ```
// vendor:
//   - lodash
//   - bar: "./path/to/bar.js"
// ```
//
// Normalized:
//
// ```
// vendor:
//   "lodash": "/absolute/path/to/lodash.js"
//   "bar": "/absolute/path/to/bar.js"
// ```
//
function normalize_vendor(app, config) {
  let result = {};

  _.forEach(config, vendorPkg => {
    let filename, moduleName, resolvedPath;

    if (_.isPlainObject(vendorPkg)) {
      moduleName = _.keys(vendorPkg);

      if (moduleName.length === 1) {
        moduleName = moduleName[0];
        filename = vendorPkg[moduleName];
      } else {
        throw new Error('Ill-formed list of vendor files.');
      }
    } else {
      moduleName = vendorPkg;
      filename = vendorPkg;
    }

    resolvedPath = resolve_module_path(app.root, filename);

    if (!resolvedPath) {
      throw `Bundler cannot find declared vendor file "${filename}"`;
    }

    result[moduleName] = resolvedPath;
  });

  return result;
}


function normalize_pkg_config(app, config) {
  config = _.defaults(config, {
    vendor: [],
    entries: [],
    depends: []
  });

  config.vendor = _.isArray(config.vendor) ? config.vendor : [ config.vendor ];
  config.entries = _.isArray(config.entries) ? config.entries : [ config.entries ];
  config.depends = _.isArray(config.depends) ? config.depends : [ config.depends ];

  config.vendor = normalize_vendor(app, config.vendor);

  config.entries = config.entries.map(entry_path => path.join(app.root, entry_path));

  return config;
}


function load_root_apps_config(applications) {
  let result = {};

  applications.forEach(app => {
    let config;
    let file_path = path.join(app.root, 'bundle.yml');

    try {
      config = cached.yaml(file_path);
    } catch (__) {
      return; // continue
    }

    config.packages = _.mapValues(config.packages, pkg => normalize_pkg_config(app, pkg));

    result = _.mergeWith(result, config, (a, b) => {
      if (_.isArray(a)) {
        return _.uniq(a.concat(b || []));
      }
    });
  });

  // Ensure existence of the declared dependences.
  _.forEach(result.packages, (pkg_conf, pkg_name) => {
    pkg_conf.depends.forEach(dep_name => {
      if (!result.packages[dep_name]) {
        throw new Error(`"${pkg_name}" package depends on a non-existent "${dep_name}" package`);
      }
    });
  });

  return result;
}


function find_files_one(type_name, root, pattern) {
  if (_.startsWith(pattern, '!npm:')) {
    let file_path = require.resolve(pattern.substr('!npm:'.length));

    return [ { path: file_path } ];
  }

  let result = [];

  try {
    glob(pattern, { cwd: root, nodir: true })
      .filter(name => !/^[._]|\\[._]|\/[_.]/.test(name))
      .forEach(file => result.push({ path: path.join(root, file) }));

  } catch (__) {
    // Skip on error
    return [];
  }

  if (pattern.indexOf('*') === -1 && result.length === 0) {
    throw new Error(`Error in "config.yml": section "${type_name}" miss `
      + `search path for "${pattern}" (${root}), missed`);
  }

  return result;
}


function find_files(root, type_cfg) {
  let result = {};

  // Each type contains array with possible values:
  //
  // 1. '*.styl'
  // 2. 'i18n/*.yml'
  // 3. 'dirname/test.js'
  // 4. 'dirname2/*.js'
  // 5. 'index.js'
  // 6. '!npm:path/to/npm/file.js'
  //

  _.forEach(type_cfg, (patterns, type_name) => {
    patterns.forEach(search => {
      let files = find_files_one(type_name, root, search);

      result[type_name] = (result[type_name] || []).concat(files);
    });
  });

  return result;
}


// - options
//   - pkg_name
//   - entry_root
//   - cfg
//   - files
//
function scan_entry(options) {
  let current_cfg = options.cfg;
  let cfg_path = path.join(options.entry_root, 'config.yml');

  options.files = options.files || {};

  let data;

  try {
    data = fs.readFileSync(cfg_path, 'utf8');
  } catch (__) {}

  if (!data && !current_cfg) {
    return;
  }

  if (data) {
    let config = yaml.safeLoad(data, { filename: cfg_path });

    // Normalize config - convert all types to array
    config.type = _.mapValues(config.type || {}, value => (_.isArray(value) ? value : [ value ]));

    if (config.inherit !== false) {
      current_cfg = _.defaultsDeep({}, config, current_cfg);
    } else {
      current_cfg = config;
    }
  }

  let api_prefix = options.pkg_name + '.' +
    path
      .relative(options.api_path_root, options.entry_root)
      .replace(new RegExp('\\' + path.sep, 'g'), '.');

  api_prefix = api_prefix.replace(/[.]$/, ''); // Cut tailing . if nested path empty

  _.forEach(find_files(options.entry_root, current_cfg.type), (files_arr, type) => {
    files_arr = files_arr.map(file_info => {
      file_info.public = current_cfg.public;

      // css/bin have no apipath
      if (type === 'css' || type === 'bin') {
        return file_info;
      }

      // i18n needs prefix only, and adds tail after file parse later
      if (type === 'widget_i18n') {
        file_info.api_path = api_prefix;
        return file_info;
      }

      // user/album/album.jade -> user.album
      // user/album.jade -> user.album
      let pathObj = path.parse(file_info.path);

      if (path.parse(pathObj.dir).base === pathObj.name) {
        file_info.api_path = api_prefix;
      } else {
        file_info.api_path = api_prefix + '.' + pathObj.name;
      }

      return file_info;
    });

    options.files[type] = (options.files[type] || []).concat(files_arr);
  });

  if (!current_cfg.recursive) {
    return;
  }

  // Exclude paths without '*' from recursive search
  Object.keys(current_cfg.type).forEach(type_name => {
    current_cfg.type[type_name] = current_cfg.type[type_name].filter(pattern => pattern.indexOf('*') !== -1);
  });

  glob('*/', { cwd: options.entry_root }).filter(name => !/^[._]|\\[._]|\/[_.]/.test(name)).forEach(file => {
    scan_entry({
      pkg_name: options.pkg_name,
      api_path_root: options.api_path_root,
      entry_root: path.join(options.entry_root, file),
      cfg: current_cfg,
      files: options.files
    });
  });
}


module.exports = function (applications) {
  let result = load_root_apps_config(applications);
  let used_packages = [];

  _.forEach(result.bundles, pkgs => {
    used_packages = used_packages.concat(pkgs);
  });

  Object.keys(result.packages).forEach(pkg_name => {
    let pkg = result.packages[pkg_name];

    if (used_packages.indexOf(pkg_name) === -1) {
      throw new Error(`Package "${pkg_name}" is defined, but not assigned to any bundle, ` +
        'check "bundle.yml" in appropriate application root');
    }

    pkg.files = {};

    pkg.entries.forEach(entry_root => {
      let params = { pkg_name, entry_root, api_path_root: entry_root };

      scan_entry(params);

      pkg.files = _.mergeWith(pkg.files, params.files, (a, b) => {
        if (_.isArray(a)) {
          return a.concat(b || []);
        }
      });
    });
  });

  return result;
};


module.exports.resolve_module_path = resolve_module_path;
