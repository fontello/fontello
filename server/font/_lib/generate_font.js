// Working procedure for the font builder queue.
//


'use strict';


var _        = require('lodash');
var util     = require('util');
var path     = require('path');
var fs       = require('fs');
var fstools  = require('fs-tools');
var execFile = require('child_process').execFile;
var async    = require('async');
var ttf2eot  = require('ttf2eot');
var ttf2woff = require('ttf2woff');
var jade     = require('jade');


var FONTFORGE_BIN   = 'fontforge';
var TTFAUTOHINT_BIN = 'ttfautohint';
var ZIP_BIN         = 'zip';


var TEMPLATES_DIR = path.join(__dirname, '../../../support/font-templates');


var JADE_TEMPLATES = {};

_.forEach([
  'demo.jade'
, 'css/css.jade'
, 'css/css-ie7.jade'
, 'css/css-codes.jade'
, 'css/css-ie7-codes.jade'
, 'css/css-embedded.jade'
, 'LICENSE.jade'
], function (name) {
  var file = path.join(TEMPLATES_DIR, name);

  JADE_TEMPLATES[name] = jade.compile(fs.readFileSync(file, 'utf8'), {
    pretty: true,
    filename: file
  });
});


var SVG_FONT_TEMPLATE = _.template(
  '<?xml version="1.0" standalone="no"?>\n' +
  '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
  '<svg xmlns="http://www.w3.org/2000/svg">\n' +
  '<metadata>${font.copyright}</metadata>\n' +
  '<defs>\n' +
  '<font id="${font.fontname}" horiz-adv-x="${font.ascent - font.descent}" >\n' +

  '<font-face' +
    ' font-family="${font.familyname}"' +
    ' font-weight="400"' +
    ' font-stretch="normal"' +
    ' units-per-em="${font.ascent - font.descent}"' +
    //panose-1="2 0 5 3 0 0 0 0 0 0"
    ' ascent="${font.ascent}"' +
    ' descent="${font.descent}"' +
    //bbox="-1.33333 -150.333 1296 850"
    //underline-thickness="50"
    //underline-position="-100"
    //unicode-range="U+002B-1F6AB"
  ' />\n' +

  '<missing-glyph horiz-adv-x="${font.ascent - font.descent}" />\n' +

  '<% glyphs.forEach(function(glyph) { %>' +
    '<glyph' +
      ' glyph-name="${glyph.css}"' +
      ' unicode="&#x${glyph.code.toString(16)};"' +
      ' d="${glyph.d}"' +
      ' horiz-adv-x="${glyph.width}"' +
    ' />\n' +
  '<% }); %>' +

  '</font>\n' +
  '</defs>\n' +
  '</svg>'
);


module.exports = function generateFont(taskInfo, callback) {
  var logPrefix = '[font::' + taskInfo.fontId + ']'
    , timeStart = Date.now()
    , workplan  = []
    , fontname  = taskInfo.builderConfig.font.fontname
    , files
      // All next: generated raw data.
    , configOutput = JSON.stringify(taskInfo.clientConfig, null, '  ')
    , svgOutput
    , ttfOutput
    , woffOutput
    , eotOutput;

  taskInfo.logger.info('%s Start generation: %j', logPrefix, taskInfo.clientConfig);

  // Collect file paths.
  files = {
    config:       path.join(taskInfo.tmpDir, 'config.json')
  , svg:          path.join(taskInfo.tmpDir, 'font', fontname + '.svg')
  , ttf:          path.join(taskInfo.tmpDir, 'font', fontname + '.ttf')
  , ttfUnhinted:  path.join(taskInfo.tmpDir, 'font', fontname + '-unhinted.ttf')
  , eot:          path.join(taskInfo.tmpDir, 'font', fontname + '.eot')
  , woff:         path.join(taskInfo.tmpDir, 'font', fontname + '.woff')
  };

  // Generate initial SVG font.
  svgOutput = SVG_FONT_TEMPLATE(taskInfo.builderConfig);

  // Prepare temporary working directory.
  workplan.push(async.apply(fstools.remove, taskInfo.tmpDir));
  workplan.push(async.apply(fstools.mkdir, taskInfo.tmpDir));
  workplan.push(async.apply(fstools.mkdir, path.join(taskInfo.tmpDir, 'font')));
  workplan.push(async.apply(fstools.mkdir, path.join(taskInfo.tmpDir, 'css')));

  // Write clinet config and initial SVG font.
  workplan.push(async.apply(fs.writeFile, files.config, configOutput, 'utf8'));
  workplan.push(async.apply(fs.writeFile, files.svg, svgOutput, 'utf8'));

  // Convert SVG to TTF with FontForge.
  workplan.push(async.apply(execFile, FONTFORGE_BIN, [
    '-c'
  , util.format('font = fontforge.open(%j); font.generate(%j)', files.svg, files.ttfUnhinted)
  ], { cwd: taskInfo.cwdDir }));

  // Autohint the resulting TTF.
  workplan.push(async.apply(execFile, TTFAUTOHINT_BIN, [
    '--latin-fallback'
  , '--no-info'
  , '--windows-compatibility'
  , '--symbol'
  , files.ttfUnhinted
  , files.ttf
  ], { cwd: taskInfo.cwdDir }));

  workplan.push(async.apply(fstools.remove, files.ttfUnhinted));

  // Read the resulting TTF to produce EOT and WOFF.
  workplan.push(function (next) {
    fs.readFile(files.ttf, null, function (err, data) {
      ttfOutput = data;
      next(err);
    });
  });

  // Convert TTF to EOT.
  workplan.push(function (next) {
    eotOutput = ttf2eot(ttfOutput);
    fs.writeFile(files.eot, eotOutput, next);
  });

  // Convert TTF to WOFF.
  workplan.push(function (next) {
    ttf2woff(ttfOutput, {}, function (err, data) {
      woffOutput = data;
      if (err) {
        next(err);
        return;
      }
      fs.writeFile(files.woff, data, next);
    });
  });

  // Write dynamic files.
  _.forEach({
    'demo.jade'              : 'demo.html'
  , 'css/css.jade'           : 'css/' + fontname + '.css'
  , 'css/css-ie7.jade'       : 'css/' + fontname + '-ie7.css'
  , 'css/css-codes.jade'     : 'css/' + fontname + '-codes.css'
  , 'css/css-ie7-codes.jade' : 'css/' + fontname + '-ie7-codes.css'
  , 'css/css-embedded.jade'  : 'css/' + fontname + '-embedded.css'
  , 'LICENSE.jade'           : 'LICENSE.txt'
  }, function (outputName, inputName) {
    var outputFile = path.join(taskInfo.tmpDir, outputName)
      , result = JADE_TEMPLATES[inputName](taskInfo.builderConfig);

    workplan.push(function (next) {
      result = result.replace('%WOFF64%', woffOutput.toString('base64'))
                     .replace('%TTF64%', ttfOutput.toString('base64'));

      fs.writeFile(outputFile, result, 'utf8', next);
    });
  });

  // Copy static files.
  _.forEach([
    'css/animation.css'
  , 'README.txt'
  ], function (name) {
    var inputFile  = path.join(TEMPLATES_DIR, name)
      , outputFile = path.join(taskInfo.tmpDir, name);

    workplan.push(async.apply(fstools.copy, inputFile, outputFile));
  });

  // Create the zipball.
  workplan.push(async.apply(fstools.mkdir, path.dirname(taskInfo.output)));
  workplan.push(async.apply(execFile, ZIP_BIN, [
    taskInfo.output
  , '-r'
  , taskInfo.tmpDir
  ], { cwd: taskInfo.cwdDir }));

  // Remove temporary files and directories.
  workplan.push(async.apply(fstools.remove, taskInfo.tmpDir));

  // Execute the workplan.
  async.series(workplan, function (err) {
    if (err) {
      taskInfo.logger.error('%s %s', logPrefix, err.stack || err.message || err.toString());
      callback(err);
      return;
    }

    var timeEnd = Date.now();

    taskInfo.logger.info('%s Generated in %dms (real: %dms)',
                         logPrefix,
                         (timeEnd - timeStart) / 1000,
                         (timeEnd - taskInfo.timestamp) / 1000);
    callback();
  });
};
