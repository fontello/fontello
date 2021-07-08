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

  for (let [ key, val ] of Object.entries(phrases)) {
    if (key[0] === '=') {
      accum[prefix + key.slice(1)] = val;
      continue;
    }

    if (_.isPlainObject(val)) {
      normalize(val, prefix + key + '.', accum);
      continue;
    }

    accum[prefix + key] = val;
  }

  return accum;
}


let read_i18n_file = _.memoize(function (path) {
  let contents = fs.readFileSync(path, 'utf8');

  return yaml.load(contents, { filename: path });
});


module.exports = function (sandbox) {
  let N = sandbox.N;
  let default_lang = N.config.locales[0];
  let all_phrases = { client: {}, server: {} };

  for (let lang of N.config.locales) {
    all_phrases.client[lang] = {};
    all_phrases.server[lang] = {};
  }


  // Collect phrases from language files
  //
  for (let [ pkg_name, pkg ] of Object.entries(sandbox.config.packages)) {
    for (let file_info of pkg.files.widget_i18n || []) {
      let data = read_i18n_file(file_info.path);

      for (let [ lang, phrases ] of Object.entries(data)) {
        let norm_phrases = normalize(phrases);

        /* eslint-disable max-depth */
        for (let [ path, phrase ] of Object.entries(norm_phrases)) {
          let api_path = file_info.api_path + '.' + path;

          if (file_info.public) {
            all_phrases.client[lang][api_path] = { phrase, path: file_info.path, pkg: pkg_name };
          }

          all_phrases.server[lang][api_path] = { phrase, path: file_info.path, pkg: pkg_name };
        }
      }
    }
  }

  // Collect phrases from config
  //
  for (let [ locale_name, locale ] of Object.entries(sandbox.N.config.i18n || {})) {
    for (let [ pkg_name, phrases ] of Object.entries(locale)) {
      let norm_phrases = normalize(phrases);

      for (let [ path, phrase ] of Object.entries(norm_phrases)) {
        let api_path = pkg_name + '.' + path;

        all_phrases.client[locale_name][api_path] = { phrase, path: null, pkg: pkg_name };
        all_phrases.server[locale_name][api_path] = { phrase, path: null, pkg: pkg_name };
      }
    }
  }


  // Setup client asses
  //
  for (let api_path of Object.keys(all_phrases.client[default_lang])) {
    for (let lang of N.config.locales) {
      let set_lang = all_phrases.client[lang][api_path] ? lang : default_lang;
      let data = all_phrases.client[set_lang][api_path];

      sandbox.component_server[data.pkg].i18n[lang].addPhrase(set_lang, data.path, api_path, data.phrase);
      sandbox.component_client[data.pkg].i18n[lang].addPhrase(set_lang, data.path, api_path, data.phrase);
    }
  }


  // Setup server asses
  //
  for (let api_path of Object.keys(all_phrases.server[default_lang])) {
    for (let lang of N.config.locales) {
      let set_lang = all_phrases.server[lang][api_path] ? lang : default_lang;
      let data = all_phrases.server[set_lang][api_path];

      sandbox.component_server[data.pkg].i18n[lang].addPhrase(set_lang, data.path, api_path, data.phrase);
    }
  }
};
