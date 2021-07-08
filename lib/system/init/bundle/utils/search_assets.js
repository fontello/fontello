'use strict';


const _       = require('lodash');
const fs      = require('fs');
const path    = require('path');
const yaml    = require('js-yaml');
const glob    = require('glob').sync;


function load_root_apps_config(applications) {
  let result = {};

  for (let app of applications) {
    result = _.mergeWith(result, app.config, (a, b) => {
      if (Array.isArray(a)) {
        return _.uniq(a.concat(b || []));
      }
    });
  }

  // Ensure existence of the declared dependences.
  for (let [ pkg_name, pkg_conf ] of Object.entries(result.packages)) {
    for (let dep_name of pkg_conf.depends) {
      if (!result.packages[dep_name]) {
        throw new Error(`"${pkg_name}" package depends on a non-existent "${dep_name}" package`);
      }
    }
  }

  return result;
}


function find_files_one(type_name, root, pattern) {
  if (pattern.startsWith('!npm:')) {
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

  for (let [ type_name, patterns ] of Object.entries(type_cfg)) {
    for (let search of patterns) {
      let files = find_files_one(type_name, root, search);

      result[type_name] = (result[type_name] || []).concat(files);
    }
  }

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
    let config = yaml.load(data, { filename: cfg_path });

    // Normalize config - convert all types to array
    config.type = config.type || {};

    for (let key of Object.keys(config.type)) {
      if (!Array.isArray(config.type[key])) config.type[key] = [ config.type[key] ];
    }

    if (config.inherit !== false) {
      current_cfg = Object.assign({}, _.cloneDeep(current_cfg), config);
    } else {
      current_cfg = config;
    }
  }

  let api_prefix = options.pkg_name + '.' +
    path
      .relative(options.api_path_root, options.entry_root)
      .replace(new RegExp('\\' + path.sep, 'g'), '.');

  api_prefix = api_prefix.replace(/[.]$/, ''); // Cut tailing . if nested path empty

  for (let [ type, files_arr ] of Object.entries(find_files(options.entry_root, current_cfg.type))) {
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
  }

  if (!current_cfg.recursive) {
    return;
  }

  // Exclude paths without '*' from recursive search
  for (let type_name of Object.keys(current_cfg.type)) {
    current_cfg.type[type_name] = current_cfg.type[type_name].filter(pattern => pattern.indexOf('*') !== -1);
  }

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

  for (let pkgs of Object.values(result.bundles)) {
    used_packages = used_packages.concat(pkgs);
  }

  for (let pkg_name of Object.keys(result.packages)) {
    let pkg = result.packages[pkg_name];

    if (used_packages.indexOf(pkg_name) === -1) {
      throw new Error(`Package "${pkg_name}" is defined, but not assigned to any bundle, ` +
        'check "bundle.yml" in appropriate application root');
    }

    pkg.files = {};

    for (let entry_root of pkg.entries) {
      let params = { pkg_name, entry_root, api_path_root: entry_root };

      scan_entry(params);

      pkg.files = _.mergeWith(pkg.files, params.files, (a, b) => {
        if (Array.isArray(a)) {
          return a.concat(b || []);
        }
      });
    }
  }

  return result;
};
