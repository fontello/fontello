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
//var AdmZip   = require('adm-zip');
var io       = require('../../../lib/system/io');


var FONTFORGE_BIN   = 'fontforge';
var TTFAUTOHINT_BIN = 'ttfautohint';
var ZIP_BIN         = 'zip';


var TEMPLATES_DIR = path.join(__dirname, '../../../support/font-templates');
var TEMPLATES = {};

_.forEach({
  'demo.jade'              : 'demo.html'
, 'css/css.jade'           : 'css/${FONTNAME}.css'
, 'css/css-ie7.jade'       : 'css/${FONTNAME}-ie7.css'
, 'css/css-codes.jade'     : 'css/${FONTNAME}-codes.css'
, 'css/css-ie7-codes.jade' : 'css/${FONTNAME}-ie7-codes.css'
, 'css/css-embedded.jade'  : 'css/${FONTNAME}-embedded.css'
, 'LICENSE.jade'           : 'LICENSE.txt'
, 'css/animation.css'      : 'css/animation.css'
, 'README.txt'             : 'README.txt'
}, function (outputName, inputName) {
  var inputFile = path.join(TEMPLATES_DIR, inputName)
    , inputData = fs.readFileSync(inputFile, 'utf8')
    , outputData;

  switch (path.extname(inputName)) {
  case '.jade': // Jade template.
    outputData = jade.compile(inputData, {
      pretty:   true
    , filename: inputFile
    });
    break;

  case '.tpl': // Lodash template.
    outputData = _.template(inputData);
    break;

  default: // Static file - just do a copy.
    outputData = function () { return inputData; };
    break;
  }

  TEMPLATES[outputName] = outputData;
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


module.exports = function fontWorker(taskInfo, callback) {
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
  workplan.push(function (next) {
    execFile(FONTFORGE_BIN, [
      '-c',
      util.format('font = fontforge.open(%j); font.generate(%j)',
      files.svg,
      files.ttfUnhinted)
    ]
    , { cwd: taskInfo.cwdDir }
    , function (err) {
      if (err) {
        next({ code: io.APP_ERROR, message: 'Fontforge error. Probably, some glyph codes are invalid' });
        return;
      }
      next();
    });
  });

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

  // Write template files. (generate dynamic and copy static)
  _.forEach(TEMPLATES, function (templateData, templateName) {
    var outputName = templateName.replace('${FONTNAME}', fontname)
      , outputFile = path.join(taskInfo.tmpDir, outputName)
      , outputData = templateData(taskInfo.builderConfig);

    workplan.push(function (next) {
      outputData = outputData.replace('%WOFF64%', woffOutput.toString('base64'))
                             .replace('%TTF64%', ttfOutput.toString('base64'));

      fs.writeFile(outputFile, outputData, 'utf8', next);
    });
  });

  // Create zipball
  workplan.push(async.apply(fstools.remove, taskInfo.output));
  workplan.push(async.apply(fstools.mkdir, path.dirname(taskInfo.output)));

  // switch to node's module for portability
  workplan.push(async.apply(execFile, ZIP_BIN, [
    taskInfo.output
  , '-r'
  , path.basename(taskInfo.tmpDir)
  ], { cwd: path.dirname(taskInfo.tmpDir) }));
  /* archives are sometime broken, use system zip
  workplan.push(function (next) {
    var zip = new AdmZip();

    fstools.walk(taskInfo.tmpDir, function (filename, stats, cb) {
      var shortName = filename.substr(path.dirname(taskInfo.tmpDir).length +1);

      fs.readFile(filename, function(err, data) {
        if (err) { cb(err); return; }
        zip.addFile(shortName, data);
        cb();
      });

    }, function (err) {
      if (err) { next(err); return; }
      // FIXME: zip should be async, but it doesn't work this way (callback not executed)
      var outBuffer = zip.toBuffer();
      fs.writeFile(taskInfo.output, outBuffer, next);
      //zip.toBuffer(function(outBuffer) {
      //  fs.writeFile(taskInfo.output, outBuffer, next);
      //});
    });
  });
  */

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
