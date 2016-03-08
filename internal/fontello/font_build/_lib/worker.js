// Working procedure for the font builder queue.
//
'use strict';


const _        = require('lodash');
const path     = require('path');
const fs       = require('fs');
const execFile = require('child_process').execFile;
const async    = require('async');
const ttf2eot  = require('ttf2eot');
const ttf2woff = require('ttf2woff');
const svg2ttf  = require('svg2ttf');
const jade     = require('jade');
const b64      = require('base64-js');
const rimraf   = require('rimraf');
const mkdirp   = require('mkdirp');
const io       = require('../../../../lib/system/io');


const TEMPLATES_DIR = path.join(__dirname, '../../../../support/font-templates');
const TEMPLATES = {};


_.forEach({
  'demo.jade':              'demo.html',
  'css/css.jade':           'css/${FONTNAME}.css',
  'css/css-ie7.jade':       'css/${FONTNAME}-ie7.css',
  'css/css-codes.jade':     'css/${FONTNAME}-codes.css',
  'css/css-ie7-codes.jade': 'css/${FONTNAME}-ie7-codes.css',
  'css/css-embedded.jade':  'css/${FONTNAME}-embedded.css',
  'LICENSE.jade':           'LICENSE.txt',
  'css/animation.css':      'css/animation.css',
  'README.txt':             'README.txt'
}, (outputName, inputName) => {
  let inputFile = path.join(TEMPLATES_DIR, inputName);
  let inputData = fs.readFileSync(inputFile, 'utf8');
  let outputData;

  switch (path.extname(inputName)) {
    case '.jade': // Jade template.
      outputData = jade.compile(inputData, {
        pretty: true,
        filename: inputFile
      });
      break;

    case '.tpl': // Lodash template.
      outputData = _.template(inputData);
      break;

    default: // Static file - just do a copy.
      outputData = function () {
        return inputData;
      };
      break;
  }

  TEMPLATES[outputName] = outputData;
});

const SVG_FONT_TEMPLATE = _.template(
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


module.exports = function fontWorker(taskInfo) {
  let logPrefix = '[font::' + taskInfo.fontId + ']';
  let timeStart = Date.now();
  let workplan = [];
  let fontname = taskInfo.builderConfig.font.fontname;
  let files;
  // All next: generated raw data.
  let configOutput = JSON.stringify(taskInfo.clientConfig, null, '  ');
  let svgOutput;
  let ttfOutput;
  let eotOutput;
  let woffOutput;

  taskInfo.logger.info(`${logPrefix} Start generation: ${JSON.stringify(taskInfo.clientConfig)}`);

  // Collect file paths.
  files = {
    config:      path.join(taskInfo.tmpDir, 'config.json'),
    svg:         path.join(taskInfo.tmpDir, 'font', `${fontname}.svg`),
    ttf:         path.join(taskInfo.tmpDir, 'font', `${fontname}.ttf`),
    ttfUnhinted: path.join(taskInfo.tmpDir, 'font', `${fontname}-unhinted.ttf`),
    eot:         path.join(taskInfo.tmpDir, 'font', `${fontname}.eot`),
    woff:        path.join(taskInfo.tmpDir, 'font', `${fontname}.woff`)
  };

  // Generate initial SVG font.

  /*eslint-disable new-cap*/
  svgOutput = SVG_FONT_TEMPLATE(taskInfo.builderConfig);

  // Prepare temporary working directory.

  workplan.push(async.apply(rimraf, taskInfo.tmpDir));
  workplan.push(async.apply(mkdirp, taskInfo.tmpDir));
  workplan.push(async.apply(mkdirp, path.join(taskInfo.tmpDir, 'font')));
  workplan.push(async.apply(mkdirp, path.join(taskInfo.tmpDir, 'css')));

  // Write clinet config and initial SVG font.

  workplan.push(async.apply(fs.writeFile, files.config, configOutput, 'utf8'));
  workplan.push(async.apply(fs.writeFile, files.svg, svgOutput, 'utf8'));

/*
  // Convert SVG to TTF with FontForge

  var FONTFORGE_BIN = 'fontforge';
  workplan.push(function (next) {
    execFile(FONTFORGE_BIN, [
      '-c',
      format('font = fontforge.open(%j); font.generate(%j)',
      files.svg,
      files.ttf)
    ]
    , { cwd: taskInfo.cwdDir }
    , function (err) {
      if (err) {
        next({
          code: io.APP_ERROR,
          message: 'Fontforge exec error. Probably, missed binary, or some glyph codes are invalid'
        });
        return;
      }
      next();
    });
  });
*/

  // Convert SVG to TTF

  workplan.push(next => {
    let ttf;

    try {
      ttf = svg2ttf(svgOutput, { copyright: taskInfo.builderConfig.font.copyright });
    } catch (e) {
      next(e);
      return;
    }
    fs.writeFile(files.ttf, new Buffer(ttf.buffer), next);
  });


  // Autohint the resulting TTF.

  const TTFAUTOHINT_BIN = 'ttfautohint';

  workplan.push(next => {
    let max_segments = _.maxBy(taskInfo.builderConfig.glyphs, glyph => glyph.segments).segments;

    // KLUDGE :)
    // Don't allow hinting if font has "strange" glyphs.
    // That's useless anyway, and can hang ttfautohint < 1.0
    if (max_segments > 500) {
      next();
      return;
    }

    if (!taskInfo.builderConfig.hinting) {
      next();
      return;
    }

    fs.rename(files.ttf, files.ttfUnhinted, err => {
      if (err) {
        next(err);
        return;
      }

      execFile(TTFAUTOHINT_BIN, [
        '--no-info',
        '--windows-compatibility',
        '--symbol',
        files.ttfUnhinted,
        files.ttf
      ], { cwd: taskInfo.cwdDir }, (err, stdout, stderr) => {
        if (err) {
          next({
            code: io.APP_ERROR,
            message: `ttfautohint error:\n${err}\n${stdout}\n${stderr}`
          });
          return;
        }

        fs.unlink(files.ttfUnhinted, next);
      });
    });
  });


  // Read the resulting TTF to produce EOT and WOFF.

  workplan.push(next => {
    fs.readFile(files.ttf, null, (err, data) => {
      ttfOutput = new Uint8Array(data);
      next(err);
    });
  });


  // Convert TTF to EOT.

  workplan.push(next => {
    try {
      eotOutput = ttf2eot(ttfOutput).buffer;
    } catch (e) {
      next(e);
      return;
    }
    fs.writeFile(files.eot, new Buffer(eotOutput), next);
  });


  // Convert TTF to WOFF.

  workplan.push(next => {
    try {
      woffOutput = ttf2woff(ttfOutput).buffer;
    } catch (e) {
      next(e);
      return;
    }
    fs.writeFile(files.woff, new Buffer(woffOutput), next);
  });


  // Write template files. (generate dynamic and copy static)

  _.forEach(TEMPLATES, (templateData, templateName) => {

    // don't create license file when no copyright data exists

    if ((templateName === 'LICENSE.txt') && (!taskInfo.builderConfig.fonts_list.length)) {
      return;
    }

    let outputName = templateName.replace('${FONTNAME}', fontname);
    let outputFile = path.join(taskInfo.tmpDir, outputName);
    let outputData = templateData(taskInfo.builderConfig);

    workplan.push(function (next) {
      outputData = outputData.replace('%WOFF64%', b64.fromByteArray(woffOutput))
                             .replace('%TTF64%', b64.fromByteArray(ttfOutput));

      fs.writeFile(outputFile, outputData, 'utf8', next);
    });
  });


  // Create zipball.
  // Use ".tmp" extension here to prevent Fontello from allowing to
  // download this file while it's *in progress*.

  workplan.push(async.apply(rimraf, taskInfo.output));
  workplan.push(async.apply(mkdirp, path.dirname(taskInfo.output)));

  // switch to node's module for portability

  let ZIP_BIN = 'zip';

  workplan.push(async.apply(execFile, ZIP_BIN, [
    taskInfo.output + '.tmp',
    '-r',
    path.basename(taskInfo.tmpDir)
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


  // Remove ".tmp" extension from zip file to mark it as *completed*.
  workplan.push(async.apply(fs.rename, taskInfo.output + '.tmp', taskInfo.output));


  // Remove temporary files and directories.
  workplan.push(async.apply(rimraf, taskInfo.tmpDir));


  // Execute the workplan.
  return new Promise((resolve, reject) => {
    async.series(workplan, err => {
      if (err) {
        taskInfo.logger.error(`${logPrefix} ${err.stack || err.message || err.toString()}`);
        reject(err);
        return;
      }

      let timeEnd = Date.now();

      taskInfo.logger.info(`${logPrefix} Generated in ${(timeEnd - timeStart) / 1000} ` +
                           `(real: ${(timeEnd - taskInfo.timestamp) / 1000})`);
      resolve();
    });
  });
};
