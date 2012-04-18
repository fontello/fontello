#!/usr/bin/env python

import sys
import os
import argparse
import json
import yaml
import fontforge


error = sys.stderr.write


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Css generator')
    parser.add_argument('config', nargs='+', type=str,
        help='Config example: src/font1/config.yml src/font2/config.yml')
    parser.add_argument('-o', '--dst_file',  type=str, required=True,
        help='Output css file')

    args = parser.parse_args()

    css_class    = []
    css_fontface = []

    tpl_class    = ".font-embedded-{i} {{ font-family: '{fontname}'; }}"
    tpl_fontface = """@font-face {{
  font-family: '{fontname}';
  src: url('/static/assets/embedded_fonts/{fontname}.eot');
  src: url('/static/assets/embedded_fonts/{fontname}.eot?#iefix') format('embedded-opentype'),
    url('/static/assets/embedded_fonts/{fontname}.woff') format('woff'),
    url('/static/assets/embedded_fonts/{fontname}.ttf') format('truetype'),
    url('/static/assets/embedded_fonts/{fontname}.svg#{fontname}') format('svg');
  font-weight: normal;
  font-style: normal;
}}"""

    for i, config_path in enumerate(args.config):
        try:
            config = yaml.load(open(config_path, 'r'))
        except IOError as (errno, strerror):
            error('Cannot open %s: %s\n' % (config_path, strerror))
            sys.exit(1)
        except yaml.YAMLError, e:
            if hasattr(e, 'problem_mark'):
                mark = e.problem_mark
                error('YAML parser error in file %s at line %d, col %d\n' %
                    (config_path, mark.line + 1, mark.column + 1))
            else:
                error('YAML parser error in file %s: %s\n' % (config_path, e))
            sys.exit(1)

        fontname = config.get('font', {}).get('fontname', None)
        if not fontname:
            error('Error: cannot find "font: fontname" in file %s\n' %
                config_path)
            sys.exit(1)

        css_class.append(tpl_class.format(i=i, fontname=fontname))
        css_fontface.append(tpl_fontface.format(fontname=fontname))

    css = '\n'.join(css_class) + '\n\n' + '\n\n'.join(css_fontface)

    try:
        open(args.dst_file, 'w').write(css)
    except:
        error('Cannot write to file %s\n' % args.dst_file)
        sys.exit(1)

    sys.exit(0)
