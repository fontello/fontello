'use strict';


const glob          = require('glob').sync;
const _             = require('lodash');
const fs            = require('fs');
const path          = require('path');
const cluster       = require('cluster');
const crypto        = require('crypto');
const BabelFish     = require('babelfish');
const Bundler       = require('../../bundler');
const routerInit    = require('./bundle/router');
const stopwatch     = require('./utils/stopwatch');


const PROCESSING_QUEUE = [
  './bundle/setup',
  './bundle/create_components',
  './bundle/bin',
  './bundle/i18n',
  './bundle/views',
  './bundle/vendor',
  './bundle/js',
  './bundle/css',
  './bundle/client',
  './bundle/server',
  './bundle/compile',
  './bundle/map',
  './bundle/manifest',
  './bundle/cleanup'
].map(file => ({ fn: require(file), name: path.basename(file, '.js') }));


module.exports = function (N) {

  function init_server(N, api_path_prefix, root_path) {
    glob('**/*.js', { cwd: root_path, nodir: true }).filter(name => !/^[._]|\\[._]|\/[_.]/.test(name)).forEach(name => {
      let file_path = path.join(root_path, name);
      let init;

      init = require(file_path);

      if (!_.isFunction(init)) {
        throw `Server module must return an initilizer function as the exports at ${file_path}`;
      }

      // path is from glob, which always returns forward slashes
      let api_path_start = path.dirname(name).replace(/\//g, '.');
      let path_obj = path.parse(file_path);
      let api_path;

      // user/album/album.js -> user.album
      // user/album.js -> user.album
      if (path.parse(path_obj.dir).base === path_obj.name) {
        api_path = api_path_start;
      } else {
        api_path = api_path_start + '.' + path_obj.name;
      }

      init(N, api_path_prefix + api_path);
    });
  }


  // Init server methods
  //
  N.wire.before('init:bundle', function load_server(N) {
    let timer = stopwatch();

    N.apps.forEach(app => {
      init_server(N, 'server:', path.join(app.root, 'server'));
      init_server(N, 'internal:', path.join(app.root, 'internal'));
    });

    N.logger.info(`Loaded server and internal methods ${timer.elapsed}`);
  });


  // Router init
  //
  N.wire.before('init:bundle', function router_init(N) {
    routerInit(N);
  });


  // Process bundle queue
  //
  N.wire.on('init:bundle', async function bundle_all(N) {
    // In child process just load assets from manifest
    if (cluster.isWorker) return;

    N.logger.info('Compile assets');

    let timer = stopwatch();

    // In master process - compile assets (or rebuild outdated)
    let bundler = new Bundler({
      root: path.join(N.mainApp.root, 'assets')
    });

    let sandbox = { N, bundler };

    for (let i = 0; i < PROCESSING_QUEUE.length; i++) {
      let task = PROCESSING_QUEUE[i];
      let timer = stopwatch();

      N.wire.on(`init:bundle.${task.name}`, task.fn);

      await N.wire.emit(`init:bundle.${task.name}`, sandbox);

      N.logger.info(`◦ ${task.name} ${timer.elapsed}`);
    }

    N.logger.info(`Compile assets done ${timer.elapsed}`);
  });


  // Load server assets
  //
  N.wire.after('init:bundle', function load_server_assets(N) {
    let timer = stopwatch();
    let manifest;
    let manifest_path = path.join(N.mainApp.root, 'assets', 'server',
      `manifest-${N.environment}.json`);

    try {
      manifest = require(manifest_path);
    } catch (__) {}

    // Should never happens
    if (!manifest) {
      throw new Error(`Bundle: Can't start process - manifest file '${manifest_path}' not exists or broken.`);
    }

    N.i18n = new BabelFish();
    N.assets = manifest;
    N.assets_hash = crypto.createHash('md5')
                          .update(N.version_hash)
                          .update(JSON.stringify(manifest))
                          .digest('hex');

    let server_assets = _.filter(manifest.files, (__, logical_path) => _.startsWith(logical_path, 'server/'));

    _.forEach(server_assets, asset_info => {
      // TODO: remove this check when components will be virtual
      // assume that digestPath has forward slashes even on windows
      if (_.startsWith(asset_info.digestPath, 'server/package-component-')) {
        return; // continue
      }

      let filename = path.join(N.mainApp.root, 'assets', asset_info.digestPath);
      let code = require(filename);

      if (_.isFunction(code)) {
        code(N);
      } else {
        N.logger.debug(`Server module ${filename} empty, skipping`);
      }
    });

    N.logger.info(`Loaded manifest ${timer.elapsed}`);
  });

  // Create asset helpers
  //
  N.wire.after('init:bundle', function assets_helpers_add(N) {
    let timer = stopwatch();

    N.assets.asset_url = _.memoize(function (name) {
      // Relative paths not supported
      if (name[0] === '.') {
        N.logger.error(`Failed to find asset ${name}`);
        return '#';
      }

      let asset;

      try {
        // Try name directly first (matches are not resolveableit's not resolveable)
        asset = N.assets.files[name] || N.assets.files[require.resolve(name)];
      } catch (__) {}

      if (!asset) {
        N.logger.error(`Failed to find asset ${name}`);
        return '#';
      }

      // assume that digestPath has forward slashes even on windows
      return '/assets/' + asset.digestPath.replace(/^public\//, '');
    });


    let files_cache = {};

    _.mapValues(N.assets.files, (asset_info, logical_path) => {
      // assume that digestPath has forward slashes even on windows
      if (!_.startsWith(asset_info.digestPath, 'public/')) {
        return; // continue
      }

      files_cache[logical_path] = fs.readFileSync(path.join(N.mainApp.root, 'assets', asset_info.digestPath), 'utf8');
    });

    N.assets.asset_body = _.memoize(function (name) {
      // Relative paths not supported
      if (name[0] === '.') {
        N.logger.error(`Failed to find asset ${name}`);
        return null;
      }

      let asset_data = files_cache[require.resolve(name)];

      if (!asset_data) {
        N.logger.error(`Failed to find asset ${name}`);
        return null;
      }

      return asset_data;
    });

    N.logger.info(`Loaded assets helpers ${timer.elapsed}`);
  });
};
