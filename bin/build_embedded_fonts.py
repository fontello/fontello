#!/usr/bin/python
# -*- coding: utf-8 -*-

# this script does the following:
# 1. takes the fonts from src/fonts-original, scales them if 'rescaled' is set,
#    and puts them into src/fonts-rescaled
# 2. takes the fonts from src/fonts-rescaled, generates ".ttf", ".svg", ".woff"
#    and puts them all into assets/fonts
# 3. converts assets/fonts/*.ttf to *.eot and puts them into assets/fonts
#    if there is ttf2eot program in the system
# 4. generates assets/js/fontomas/embedded-fonts.js
# 5. generates assets/css/fontface-embedded.css

import sys
import os
import subprocess
import fontforge
import psMat
from xml.etree.ElementTree import ElementTree

script_path = os.path.abspath(sys.argv[0])
root_dir    = os.path.normpath(os.path.dirname(script_path) + '/..')
srcfont_dir = root_dir + '/src/fonts-original'
srcfont_rescaled_dir = root_dir + '/src/fonts-rescaled'
outfont_dir = root_dir + '/assets/fonts'
js_dir      = root_dir + '/assets/js/fontomas'
css_dir     = root_dir + '/assets/css'
out_jsfile  = js_dir   + '/embedded_fonts.js'
out_cssfile = css_dir  + '/fontface-embedded.css'
ttf2eot     = 'ttf2eot'

fonts = (
  {'orig': 'entypo.ttf', 'rescaled': 'entypo.ttf'},
  {'orig': 'fontawesome-webfont.svg'},
  {'orig': 'iconic_fill.ttf'},
  {'orig': 'iconic_stroke.ttf'},
  {'orig': 'websymbols-regular-webfont.ttf'}
)

formats = ('.eot', '.ttf', '.svg', '.woff')


def rescale_font(infont_path, outfont_path):
    def calc_bbox(glyphs):
        def get_outer_bbox(a, b):
            x = min(a[0], b[0])
            y = min(a[1], b[1])
            w = max(a[0] + a[2], b[0] + b[2]) - x
            h = max(a[1] + a[3], b[1] + b[3]) - y
            return (x, y, w, h)
        return reduce(get_outer_bbox, glyphs)

    font = fontforge.open(infont_path)

    #ScaleToEm(800, 200);
    font.ascent = 800
    font.descent = 200

    #bbox=GetFontBoundingBox()
    bbox = calc_bbox([g.boundingBox() for g in font.glyphs()])
    #print "bbox=", bbox

    #SelectAll();
    font.selection.all()

    #Move(-bbox[0], -bbox[1]);
    #Scale(100*1000/(bbox[3]-bbox[1]), 0, 0);
    #Move(0, -200);
    matrix1 = psMat.translate(-bbox[0], -bbox[1])
    matrix2 = psMat.scale(1000.0/(bbox[3]-bbox[1]))
    matrix3 = psMat.translate(0, -200)
    transform_matrix = psMat.compose(psMat.compose(matrix1, matrix2), matrix3)
    font.transform(transform_matrix)

    font.generate(outfont_path)


def rescale_all_fonts():
    print 'Rescaling fonts...\n'
    for f in fonts:
        infont_path = '%s/%s' % (srcfont_dir, f['orig'])
        print "in:  %s" % infont_path
        if 'rescaled' in f:
            outfont_path = '%s/%s' % (srcfont_rescaled_dir, f['rescaled'])
            rescale_font(infont_path, outfont_path)
            print "out: rescaled %s" % outfont_path
        else:
            outfont_path = '%s/%s' % (srcfont_rescaled_dir, f['orig'])
            subprocess.call(['ln', '-sf', infont_path, outfont_path])
            print "out: symlinked %s" % outfont_path
        print
    print 'done\n'


def generate_fonts():
    print 'Generating fonts...\n'
    for f in fonts:
        font_filename = f.get('rescaled', f['orig'])
        infont_path = '%s/%s' % (srcfont_rescaled_dir, font_filename)
        infont_basename, infont_ext = os.path.splitext(font_filename)
        print 'in:  %s' % infont_path
        font = fontforge.open(infont_path)
        for ext in formats:
            outfont_path = '%s/%s%s' % (outfont_dir, infont_basename, ext)
            if ext == '.eot':
                continue
            elif infont_ext == ext:
                print 'out: copying to %s' % outfont_path
                subprocess.call(['cp', infont_path, outfont_path])
                continue
            print 'out: %s' % outfont_path
            font.generate(outfont_path)
        if '.eot' in formats:
            infont_path = '%s/%s%s' % (outfont_dir, infont_basename, '.ttf')
            outfont_path = '%s/%s%s' % (outfont_dir, infont_basename, '.eot')
            print 'out: ttf2eot to %s' % outfont_path
            subprocess.call(['sh', '-c', '%s < %s > %s' % 
                (ttf2eot, infont_path, outfont_path)])
        print
    print 'done\n'


def parse_svg_fonts():
    print 'Parsing svg fonts...',
    data = []

    flen = len(fonts)
    for i, f in enumerate(fonts):
        font_filename = f.get('rescaled', f['orig'])
        basename = os.path.splitext(font_filename)[0]
        svg_filename = '%s.svg' % basename
        svg_path = '%s/%s' % (outfont_dir, svg_filename)

        tree = ElementTree()
        tree.parse(svg_path)

        root_tag = tree.getroot().tag
        if root_tag[0] == '{':
            namespace = '{%s}' % root_tag[1:].split('}')[0]
        else:
            namespace = ''

        el = tree.find('{ns}defs/{ns}font'.format(ns=namespace))
        fontname = el.get('id', 'unknown') if len(el) else 'unknown'

        el = tree.findall('{ns}defs/{ns}font/{ns}glyph'.format(ns=namespace))
        glyph_codes = filter(lambda x: x.get('unicode', None)
            and x.get("d", None), el)
        glyph_codes = map(lambda x: x.get('unicode', None) , glyph_codes)

        data.append({
            'font_id': fontname,
            'basename': basename,
            'glyph_codes': glyph_codes
        })
    print 'done\n'
    return data


def generate_js(fonts_data):
    print 'Generating js...'

    js = """/*global fontomas*/
;(function () {
  "use strict";


  fontomas.embedded_fonts = [
"""

    flen = len(fonts_data)
    for i, font in enumerate(fonts_data):
        js += '    {\n'
        js += '      id: %d,\n' % i

        js += '      fontname: \'%s\',\n' % font['font_id']
        js += '      glyphs: [\n'

        js += ',\n'.join(map(lambda x: '        0x%x'
            % ord(x), font['glyph_codes']))

        js += '\n'
        js += '      ]\n'
        js += '    }%s\n' % (',' if i != flen-1 else '')

    js += """  ];

}());
"""

    try:
        print 'out: %s' % out_jsfile
        open(out_jsfile, 'w').write(js)
        print 'done\n'
    except:
        print 'Error: can''t write() to file %s\n' % out_jsfile


def generate_css(fonts_data):
    print 'Generating css...'

    css = ''

    flen = len(fonts_data)
    for i, font in enumerate(fonts_data):
        css += '.fm-embedded-%d { font-family: \'%s\'; }\n' % (i,
            font['font_id'])

    for font in fonts_data:
        css += """
@font-face {{
  font-family: '{fontfamily}';
  src: url('/static/assets/fonts/{basename}.eot');
  src: url('/static/assets/fonts/{basename}.eot?#iefix') format('embedded-opentype'),
    url('/static/assets/fonts/{basename}.woff') format('woff'),
    url('/static/assets/fonts/{basename}.ttf') format('truetype'),
    url('/static/assets/fonts/{basename}.svg#{svg_id}') format('svg');
  font-weight: normal;
  font-style: normal;
}}
""".format(fontfamily=font['font_id'],
            basename=font['basename'],
            svg_id=font['font_id'])

    try:
        print 'out: %s' % out_cssfile
        open(out_cssfile, 'w').write(css)
        print 'done\n'
    except:
        print 'Error: can''t write() to file %s\n' % out_cssfile


if __name__ == '__main__':
    rescale_all_fonts()
    generate_fonts()
    fonts_data = parse_svg_fonts()
    generate_js(fonts_data)
    generate_css(fonts_data)
