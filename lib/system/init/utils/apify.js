// Converts filename into api path
//

'use strict';


/**
 *  Support.apify(file[, prefix = ''[, suffix = /\.js$/]]) -> String
 *  - file (Sting): File pathname
 *  - prefix (String): Prefix string or regexp (usually path to common folder)
 *  - suffix (String): Suffix string or regexp (usually file extension).
 *
 *  Build api_path based on file path (withou prefix and suffix).
 *
 *  ##### Example:
 *
 *      var prefix = '/path/to/models';
 *
 *      apify('/path/to/models/forum/post.js', prefix);
 *      // -> forum.post
 *
 *      apify('/path/to/models/forum/thread.css', prefix);
 *      // -> forum.thread.css
 *
 *      apify('/path/to/models/forum/thread.css', prefix, /\.css$/);
 *      // -> forum.thread
 **/
module.exports = function apify(file, prefix, suffix) {
  return file.replace(prefix || '', '')
             .replace(suffix || /\.js$/, '')
             .replace(/^[\/\\]+|[\/\\]+$/g, '')
             .replace(/\//g, '.');
};
