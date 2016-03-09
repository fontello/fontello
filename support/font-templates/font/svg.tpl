<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg">
<metadata>${font.copyright}</metadata>
<defs>
<font id="${font.fontname}" horiz-adv-x="${font.ascent - font.descent}" >
<font-face font-family="${font.familyname}" font-weight="400" font-stretch="normal" units-per-em="${font.ascent - font.descent}" ascent="${font.ascent}" descent="${font.descent}" />
<missing-glyph horiz-adv-x="${font.ascent - font.descent}" /><% glyphs.forEach(function(glyph) { %>
<glyph glyph-name="${glyph.css}" unicode="&#x${glyph.code.toString(16)};" d="${glyph.d}" horiz-adv-x="${glyph.width}" />
<% }); %></font>
</defs>
</svg>