#!/usr/bin/env python

import sys
import os
import shutil
import argparse
import yaml


error = sys.stderr.write


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Font copier tool')
    parser.add_argument('-c', '--config',    type=str, required=True,
        help='Config example: src/awesome-uni.font/config.yml')
    parser.add_argument('-o', '--fonts_dir', type=str, required=True,
        help='Output fonts directory')

    args = parser.parse_args()

    try:
        config = yaml.load(open(args.config, 'r'))
    except IOError as (errno, strerror):
        error('Cannot open %s: %s\n' % (args.config, strerror))
        sys.exit(1)
    except yaml.YAMLError, e:
        if hasattr(e, 'problem_mark'):
            mark = e.problem_mark
            error('YAML parser error in file %s at line %d, col %d\n' %
                (args.config, mark.line + 1, mark.column + 1))
        else:
            error('YAML parser error in file %s: %s\n' % (args.config, e))
        sys.exit(1)

    fontname = config.get('font', {}).get('fontname', None)
    if not fontname:
        error('Error: cannot find "font: fontname" in file %s\n' % args.config)
        sys.exit(1)

    if not os.path.exists(args.fonts_dir):
        error('Error: directory "%s" does not exist\n' % args.fonts_dir)
        sys.exit(1)

    if not os.path.isdir(args.fonts_dir):
        error('Error: path "%s" is not a directory\n' % args.fonts_dir)
        sys.exit(1)

    ext_list = ('.eot', '.svg', '.ttf', '.woff')
    for ext in ext_list:
        src = '%s/font/%s%s' % (os.path.dirname(args.config), fontname, ext)
        try:
            shutil.copy(src, args.fonts_dir)
        except IOError as (errno, strerror):
            error('Cannot copy "%s" to "%s": %s\n' % (args.config,
                args.fonts_dir, strerror))
            sys.exit(1)

    sys.exit(0)
