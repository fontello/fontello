<!--
${font.copyright}

Usage:
<link rel="import" href="/path/to/${font.fontname}-iconset-svg.html">
<iron-icon icon="${font.fontname}:ICON_NAME"></iron-icon>

-->
<link rel="import" href="../bower_components/iron-icon/iron-icon.html">
<link rel="import" href="../bower_components/iron-iconset-svg/iron-iconset-svg.html">

<iron-iconset-svg size="${font.ascent - font.descent}" name="${font.fontname}">
<svg xmlns="http://www.w3.org/2000/svg">
<defs>
<% glyphs.forEach(function(glyph) { %>
<g id="${glyph.css}"><path d="${glyph.d}"/></g>
<% }); %>
</defs>
</svg>
</iron-iconset-svg>
