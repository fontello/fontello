'use strict';


const _    = require('lodash');
const yaml = require('js-yaml');
const fs   = require('fs');


// Normalize objject with phrases:
//
// - flatten keys, except started with `=`
// - cut /^=/ from key names (and leave value object intact for those)
//
function normalize(phrases, prefix, accum) {
  prefix = prefix || '';
  accum  = accum || {};

  _.forEach(phrases, function (val, key) {
    if (key[0] === '=') {
      accum[prefix + key.slice(1)] = val;
      return;
    }

    if (_.isPlainObject(val)) {
      normalize(val, prefix + key + '.', accum);
      return;
    }

    accum[prefix + key] = val;
  });

  return accum;
}


var read_i18n_file = _.memoize(function (path) {
  let contents = fs.readFileSync(path, 'utf8');

  return yaml.safeLoad(contents, { path });
});


module.exports = function (sandbox) {
  let N = sandbox.N;
  let default_lang = N.config.locales[0];
  let all_phrases = { client: {}, server: {} };

  N.config.locales.forEach(lang => {
    all_phrases.client[lang] = {};
    all_phrases.server[lang] = {};
  });


  // Collect phrases from language files
  //
  _.forEach(sandbox.config.packages, (pkg, pkg_name) => {
    _.forEach(pkg.files.widget_i18n, file_info => {
      let data = read_i18n_file(file_info.path);

      _.forEach(data, (phrases, lang) => {
        let norm_phrases = normalize(phrases);

        _.forEach(norm_phrases, (phrase, path) => {
          let api_path = file_info.api_path + '.' + path;

          if (file_info.public) {
            all_phrases.client[lang][api_path] = { phrase, path: file_info.path, pkg: pkg_name };
          }

          all_phrases.server[lang][api_path] = { phrase, path: file_info.path, pkg: pkg_name };
        });
      });
    });
  });

  // Collect phrases from config
  //
  _.forEach(sandbox.N.config.i18n || {}, (locale, locale_name) => {
    _.forEach(locale, (phrases, pkg_name) => {
      let norm_phrases = normalize(phrases);

      _.forEach(norm_phrases, (phrase, path) => {
        let api_path = pkg_name + '.' + path;

        all_phrases.client[locale_name][api_path] = { phrase, path: null, pkg: pkg_name };
        all_phrases.server[locale_name][api_path] = { phrase, path: null, pkg: pkg_name };
      });
    });
  });


  // Setup client asses
  //
  _.forEach(all_phrases.client[default_lang], (__, api_path) => {
    N.config.locales.forEach(lang => {
      let set_lang = all_phrases.client[lang][api_path] ? lang : default_lang;
      let data = all_phrases.client[set_lang][api_path];

      sandbox.component_server[data.pkg].i18n[lang].addPhrase(set_lang, data.path, api_path, data.phrase);
      sandbox.component_client[data.pkg].i18n[lang].addPhrase(set_lang, data.path, api_path, data.phrase);
    });
  });


  // Setup server asses
  //
  _.forEach(all_phrases.server[default_lang], (__, api_path) => {
    N.config.locales.forEach(lang => {
      let set_lang = all_phrases.server[lang][api_path] ? lang : default_lang;
      let data = all_phrases.server[set_lang][api_path];

      sandbox.component_server[data.pkg].i18n[lang].addPhrase(set_lang, data.path, api_path, data.phrase);
    });
  });
};
