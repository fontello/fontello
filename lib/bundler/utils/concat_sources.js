// Adds a few code strings together, builds 1-level indexed source map for them
//
// Input: [ { source1, filename1, map1 }, { source2, filename2, map2 }, ... ]
// Output: { source, map }
//
// Source is a string (required), map is json object (optional).
//

'use strict';


// 1-to-1 mapping of each source line onto itself
function create_empty_map(filename, source, lines) {
  return {
    version: 3,
    sources: [ filename ],
    sourcesContent: [ source ],
    mappings: 'AAAA;' + 'AACA;'.repeat(lines - 1)
  };
}


module.exports = function concat_sources(sources, enable_maps = false) {
  let result = [];
  let result_map = { version: 3, sections: [] };
  let line_count = 0;

  for (let { source, filename = null, map = null } of sources) {
    if (source === '') continue;
    if (!source.endsWith('\n')) source += '\n';

    result.push(source);

    if (enable_maps) {
      let current_line_count = (source.match(/\n/g) || []).length;

      if (map !== null && map.sections) {
        /* eslint-disable max-depth */
        for (let section of map.sections) {
          result_map.sections.push({
            offset: { line: line_count + section.offset.line, column: 0 },
            map: section.map
          });
        }

      } else if (map !== null) {
        result_map.sections.push({
          offset: { line: line_count, column: 0 },
          map
        });

      } else if (filename !== null) {
        result_map.sections.push({
          offset: { line: line_count, column: 0 },
          map: create_empty_map(filename, source, current_line_count)
        });
      }

      line_count += current_line_count;
    }
  }

  if (!result_map.sections.length || !enable_maps) {
    result_map = null;
  }

  return { source: result.join(''), map: result_map };
};
