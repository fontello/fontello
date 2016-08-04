'use strict';


const _         = require('lodash');
const path      = require('path');
const mutexify  = require('mutexify');
const co        = require('bluebird-co').co;
const Promise   = require('bluebird');


function Asset(bundler, options) {
  this.__bundler__  = bundler;
  this.__buffer__   = null;
  this.__source__   = null;

  this.__promise__  = null;

  this.resolved     = false;
  this.digest       = null;

  this.virtual      = (options || {}).virtual || false;
  this.logicalPath  = (options || {}).logicalPath || '';
  this.plugins      = (options || {}).plugins || [];
  this.wrapBefore   = (options || {}).wrapBefore || '';
  this.wrapAfter    = (options || {}).wrapAfter || '';

  this.__dependencies__   = {};

  this.lock         = mutexify();
}


Object.defineProperty(Asset.prototype, 'destPath', {
  get() {
    return this.logicalPath;
  }
});


Object.defineProperty(Asset.prototype, 'digestPath', {
  get() {
    this.__throw_if_not_resolved__();

    const path_obj = path.parse(this.destPath);

    return path.join(path_obj.dir, path_obj.name + '-' + this.digest + path_obj.ext);
  }
});


Object.defineProperty(Asset.prototype, 'buffer', {
  get() {
    this.__throw_if_not_resolved__();

    if (this.__buffer__ !== null) {
      return this.__buffer__;
    }

    if (this.__source__ !== null) {
      this.__buffer__ = new Buffer(this.source);
      return this.__buffer__;
    }

    return null;
  },
  set(buf) {
    this.__source__ = null;
    this.__buffer__ = buf;
  }
});


Object.defineProperty(Asset.prototype, 'source', {
  get() {
    // this.__throw_if_not_resolved__();

    if (this.__source__ !== null) {
      return this.__source__;
    }

    if (this.__buffer__ !== null) {
      this.__source__ = String(this.__buffer__);
      return this.__source__;
    }

    return null;
  },
  set(src) {
    this.__buffer__ = null;
    this.__source__ = src;
  }
});


Object.defineProperty(Asset.prototype, 'length', {
  get() {
    this.__throw_if_not_resolved__();
    return this.buffer.length;
  }
});


Asset.prototype.__run_plugins__ = co.wrap(function* () {
  let context = {
    bundler: this.__bundler__,
    asset: this
  };

  for (let i = 0; i < this.plugins.length; i++) {
    let plugin = this.plugins[i];

    if (_.isString(plugin)) {
      yield this.__bundler__.__plugins__[plugin](context);
    } else {
      yield plugin(context);
    }
  }
});


Asset.prototype.__throw_if_not_resolved__ = function () {
  if (!this.resolved) {
    throw new Error('Asset: asset ' + this.logicalPath + ' is not resolved, you should call ".resolve()" first');
  }
};


Asset.prototype.resolve = function (/* callback */) {
  throw new Error('Asset: ".resolve()" not implemented in base class');
};


Asset.prototype.__resolveDependencies__ = function () {
  let assetDeps = _.values(this.__dependencies__).filter(d => d.depType === 'asset');

  return Promise.all(assetDeps.map(p => {
    let asset = this.__bundler__.findAsset(p.logicalPath);

    if (!asset) {
      return Promise.reject(new Error(`Broken dependency ${p.logicalPath} in asset ${this.logicalPath}`));
    }

    return asset.resolve();
  }));
};


Object.defineProperty(Asset.prototype, 'isFresh', {
  get() {
    throw new Error('Asset: ".isFresh()" not implemented in base class');
  }
});


Asset.prototype.dependOnFile = function (filename) {
  const stat = this.__bundler__.stat(filename);

  if (!stat) {
    throw new Error(`Asset: dependency file "${filename}" not found`);
  }

  this.__dependencies__[filename] = {
    depType: 'file',
    path: filename,
    digest: this.__bundler__.getFileDigest(filename)
  };
};


Asset.prototype.__save_cache__ = function () {
  let data = {
    dependencies: this.__dependencies__,
    dependenciesDigest: this.dependenciesDigest,
    buffer: this.__buffer__,
    source: this.__source__
  };

  return Promise.fromCallback(cb =>
    this.__bundler__.cache.put(this.logicalPath, data, { valueEncoding: 'json' }, cb));
};


Asset.prototype.__restore_cache__ = function () {
  return Promise.fromCallback(cb =>
    this.__bundler__.cache.get(this.logicalPath, { valueEncoding: 'json' }, cb))

    .then(
      cache => {
        let deps = this.__dependencies__;
        let deps_names = _.keys(deps);

        // Check if cache contains all defined dependencies
        if (_.intersection(deps_names, _.keys(cache.dependencies)).length !== deps_names.length) {
          return false;
        }

        this.__dependencies__ = cache.dependencies;

        // Try to resolve cached deps
        return this.__resolveDependencies__()
          .then(() => {
            if (this.dependenciesDigest !== cache.dependenciesDigest) return false;

            if (cache.buffer) this.__buffer__ = new Buffer(cache.buffer);
            else this.__source__ = cache.source;

            this.digest = cache.dependenciesDigest;

            return true;
          })
          .catch(() => {
            // If we can't resolve cached dependencies (something removed) - restore
            // defined dependencies back and skip cache
            this.__dependencies__ = deps;
            return false;
          });
      },
      err => {
        if (err.type === 'NotFoundError') return false;
        throw err;
      }
    );
};


Asset.prototype.dependOnAsset = function (asset) {
  this.__dependencies__[asset.logicalPath] = {
    depType: 'asset',
    logicalPath: asset.logicalPath
  };
};


Asset.prototype.dependOnFunction = function (helperName) {
  const bundler = this.__bundler__,
        result = bundler.__helpers__[helperName](),
        hash   = bundler.hasher.update(JSON.stringify(result)).digest('hex');

  this.__dependencies__[':function:' + helperName] = {
    depType: 'function',
    functionName: helperName,
    digest: hash
  };
};


Asset.prototype.dependencyDigest = function (depObj) {
  const bundler = this.__bundler__;

  switch (depObj.depType) {
    case 'file':
      return bundler.getFileDigest(depObj.path);

    case 'asset':
      return bundler.findAsset(depObj.logicalPath).digest;

    case 'function':
      let result = bundler.__helpers__[depObj.functionName]();
      return bundler.hasher.update(JSON.stringify(result)).digest('hex');

    default:
      throw new Error(`Asset: unknown dependency type ${depObj.depType}`);
  }
};


Asset.prototype.isDependencyFresh = function (depObj) {
  const bundler = this.__bundler__;

  switch (depObj.depType) {
    case 'file':
      let stat = bundler.stat(depObj.path);

      if (!stat) { return false; }

      return depObj.digest === bundler.getFileDigest(depObj.path);

    case 'asset':
      let asset = bundler.findAsset(depObj.logicalPath);

      if (!asset) { return false; }

      return asset.isFresh;

    case 'function':
      let result = bundler.__helpers__[depObj.functionName]();
      let hash = bundler.hasher.update(JSON.stringify(result)).digest('hex');

      return depObj.hash === hash;

    default:
      throw new Error(`Asset: unknown dependency type ${depObj.depType}`);
  }
};


Object.defineProperty(Asset.prototype, 'dependenciesDigest', {
  get() {
    const hasher = this.__bundler__.hasher;

    Object.keys(this.__dependencies__).sort().forEach(depName => {
      hasher.update(this.dependencyDigest(this.__dependencies__[depName]));
    });

    return hasher.digest('hex');
  }
});


Object.defineProperty(Asset.prototype, 'dependencies', {
  get() {
    this.__throw_if_not_resolved__();
    return this.__dependencies__;
  }
});


Asset.prototype.sourceMap = function () {
  this.__throw_if_not_resolved__();
  return null;
};


Asset.prototype.mappingUrlComment = function () {
  this.__throw_if_not_resolved__();
  return null;
};


module.exports = Asset;
