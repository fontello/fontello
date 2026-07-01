'use strict';


const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');


function resolvePath(file) {
  let res = null;

  try {
    res = require.resolve(file);
  } catch (__) {}

  return res;
}


module.exports = async function (context) {
  const sass = require('sass');

  const importer = {
    canonicalize(url, { containingUrl }) {
      const containingPath = containingUrl
        ? fileURLToPath(containingUrl)
        : context.asset.logicalPath;

      const dir_name = path.dirname(url);
      const file_name = path.basename(url);

      const possible_paths = [
        path.join(dir_name, file_name),
        path.join(dir_name, `${file_name}.scss`),
        path.join(dir_name, `${file_name}.sass`),
        path.join(dir_name, `_${file_name}.scss`),
        path.join(dir_name, `_${file_name}.sass`)
      ];

      for (const candidate of possible_paths) {
        const rel = path.join(path.dirname(containingPath), candidate);

        if (context.bundler.stat(rel)) {
          return pathToFileURL(rel);
        }

        const abs = resolvePath(candidate);

        if (abs) {
          return pathToFileURL(abs);
        }
      }

      return null;
    },

    load(canonicalUrl) {
      const filePath = fileURLToPath(canonicalUrl);
      const contents = context.bundler.readFile(filePath, 'utf8');
      return { contents, syntax: 'scss' };
    }
  };

  const result = await sass.compileStringAsync(context.asset.source, {
    url: pathToFileURL(context.asset.logicalPath),
    importers: [ importer ],
    // Bootstrap 5.1.x triggers several deprecation warnings (color-functions,
    // global-builtin, abs-percent, etc.) that can't be fixed without upgrading Bootstrap.
    quietDeps: true,
    // @import is still required for Bootstrap 5.1.x variable overrides to work;
    // silence until Bootstrap is upgraded to a @use-compatible version.
    silenceDeprecations: [ 'import' ]
  });

  context.asset.source = result.css;

  for (const fileUrl of result.loadedUrls) {
    if (fileUrl.protocol === 'file:') {
      context.asset.dependOnFile(fileURLToPath(fileUrl));
    }
  }
};
