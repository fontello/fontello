'use strict';


const path = require('path');


function resolvePath(file) {
  let res = null;

  try {
    res = require.resolve(file);
  } catch (__) {}

  return res;
}


module.exports = function (context) {

  function importer(url, prev) {
    let dir_name = path.dirname(url);
    let file_name = path.basename(url);

    let possible_paths = [
      path.join(dir_name, file_name),
      path.join(dir_name, `${file_name}.scss`),
      path.join(dir_name, `${file_name}.sass`),
      path.join(dir_name, `_${file_name}.scss`),
      path.join(dir_name, `_${file_name}.sass`)
    ];

    for (let i = 0; i < possible_paths.length; i++) {
      let rel = path.join(path.dirname(prev), possible_paths[i]);

      if (context.bundler.stat(rel)) {
        return { file: rel };
      }

      let abs = resolvePath(possible_paths[i]);

      if (abs) {
        return { file: abs };
      }
    }

    // Do nothing - sass should report itself
    return { file: url };
  }


  const sassRender = require('util').promisify(require('node-sass').render);

  return sassRender({
    data: context.asset.source,
    file: context.asset.logicalPath,
    importer
  })
  .then(data => {
    context.asset.source = data.css.toString();

    data.stats.includedFiles.forEach(file_path => {
      context.asset.dependOnFile(file_path);
    });
  });
};
