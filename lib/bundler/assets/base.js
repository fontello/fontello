'use strict';


const _       = require('lodash');
const path    = require('path');


function Asset(bundler, options = {}) {
  this.__bundler__  = bundler;
  this.__buffer__   = null;
  this.__source__   = null;
  this.__sourceMap__ = null;
  this.__sourceMapStale__ = false;

  this.__promise__  = null;

  this.resolved     = false;
  this.digest       = null;

  this.virtual      = options.virtual || false;
  this.logicalPath  = options.logicalPath || '';
  this.plugins      = options.plugins || [];
  this.wrapBefore   = options.wrapBefore || '';
  this.wrapAfter    = options.wrapAfter || '';

  this.__dependencies__   = {};
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

    // convert backward slashes on windows to forward slashes to simplify further code
    return path_obj.dir.replace(new RegExp('\\' + path.sep, 'g'), '/') + '/' +
           path_obj.name + '-' + this.digest + path_obj.ext;
  }
});


Object.defineProperty(Asset.prototype, 'buffer', {
  get() {
    this.__throw_if_not_resolved__();

    if (this.__buffer__ !== null) {
      return this.__buffer__;
    }

    if (this.__source__ !== null) {
      this.__buffer__ = Buffer.from(this.source);
      return this.__buffer__;
    }

    return null;
  },
  set(buf) {
    this.__source__ = null;
    this.__buffer__ = buf;
    this.__sourceMapStale__ = true;
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
    this.__sourceMapStale__ = true;
  }
});


Object.defineProperty(Asset.prototype, 'length', {
  get() {
    this.__throw_if_not_resolved__();
    return this.buffer.length;
  }
});


Object.defineProperty(Asset.prototype, 'sourceMap', {
  get() {
    //this.__throw_if_not_resolved__();
    if (this.__sourceMap__ && this.__sourceMapStale__) {
      // Every time source code for asset is updated, corresponding source map
      // must be updated immediately after, because line mappings have probably
      // changed.
      //
      // If you see this error, then we have a plugin that updates source code,
      // but leaves source map as is.
      //
      throw new Error('Stale source map detected for ' + this.logicalPath);
    }
    return this.__sourceMap__;
  },
  set(map) {
    // Make sure all paths in source maps are absolute,
    // otherwise plugins like clean-css may assume wrong current folder.
    //
    // They are replaced with relative paths later.
    //
    let cwd = process.cwd();

    function patch_map_sources(map) {
      if (map.sections) {
        map.sections.forEach(s => patch_map_sources(s.map));
      } else {
        map.sources = map.sources.map(src => path.resolve(cwd, src));
      }
    }

    if (map) patch_map_sources(map);

    this.__sourceMap__ = map || null;
    this.__sourceMapStale__ = false;
  }
});


// user will see this virtual path when browsing source map
Object.defineProperty(Asset.prototype, 'sourceMapPath', {
  get() {
    return path.resolve(this.__bundler__.root, this.logicalPath);
  }
});


Asset.prototype.__run_plugins__ = async function () {
  let context = {
    bundler: this.__bundler__,
    asset: this
  };

  for (let plugin of this.plugins) {
    if (typeof plugin === 'string') {
      await this.__bundler__.__plugins__[plugin](context);
    } else {
      await plugin(context);
    }
  }
};


Asset.prototype.__throw_if_not_resolved__ = function () {
  if (!this.resolved) {
    throw new Error('Asset: asset ' + this.logicalPath + ' is not resolved, you should call ".resolve()" first');
  }
};


Asset.prototype.resolve = function (/* callback */) {
  throw new Error('Asset: ".resolve()" not implemented in base class');
};


Asset.prototype.__resolveDependencies__ = function () {
  let assetDeps = Object.values(this.__dependencies__).filter(d => d.depType === 'asset');

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


Asset.prototype.__save_cache__ = async function () {
  let data = {
    dependencies: this.__dependencies__,
    dependenciesDigest: this.dependenciesDigest,
    buffer: this.__buffer__,
    source: this.__source__,
    sourceMap: this.__sourceMap__
  };

  await this.__bundler__.cache.put(this.logicalPath, data, { valueEncoding: 'json' });
};


Asset.prototype.__restore_cache__ = async function () {
  let cache;

  try {
    cache = await this.__bundler__.cache.get(this.logicalPath, { valueEncoding: 'json' });
  } catch (err) {
    if (err.type === 'NotFoundError') return false;
    throw err;
  }

  let deps = this.__dependencies__;
  let deps_names = Object.keys(deps);

  // Check if cache contains all defined dependencies
  if (_.intersection(deps_names, Object.keys(cache.dependencies)).length !== deps_names.length) {
    return false;
  }

  this.__dependencies__ = cache.dependencies;

  // Try to resolve cached deps
  try {
    await this.__resolveDependencies__();

    if (this.dependenciesDigest !== cache.dependenciesDigest) return false;

    if (cache.buffer) this.__buffer__ = Buffer.from(cache.buffer);
    else this.__source__ = cache.source;

    this.__sourceMap__ = cache.sourceMap;

    this.digest = cache.dependenciesDigest;

    return true;
  } catch (err) {
    // If we can't resolve cached dependencies (something removed) - restore
    // defined dependencies back and skip cache
    this.__dependencies__ = deps;
    return false;
  }
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


module.exports = Asset;
