'use strict';


const stream = require('stream');
const terser = require('terser');


module.exports = function tersify(file, opts) {
  let buffer = [];
  let enable_maps = opts._flags && opts._flags.debug;

  if (file.endsWith('.json')) {
    /* eslint-disable new-cap */
    return stream.Transform({
      transform(chunk, encoding, callback) {
        this.push(chunk);
        callback();
      }
    });
  }

  return stream.Transform({
    transform(chunk, encoding, callback) {
      buffer.push(chunk);
      callback();
    },
    flush(callback) {
      let src = Buffer.concat(buffer).toString('utf8');
      terser.minify({
        [file]: src
      }, {
        // Compress option is disabled because it is slow and has side effects,
        // while benefit is only around 3-5% of file sizes.
        compress: false,
        mangle: true,
        sourceMap: !enable_maps ? false : {
          includeSources: true,
          content: src.includes('//# sourceMappingURL=data:application/json') ? 'inline' : null,
          url: 'inline'
        }
      }).then(result => {
        if (result.error) throw result.error;
        this.push(result.code);
        callback();
      }).catch(err => {
        callback(err);
      });
    }
  });
};
