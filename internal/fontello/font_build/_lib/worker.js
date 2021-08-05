// Working procedure for the font builder queue.
//
'use strict';


const promisify = require('util').promisify;
const _         = require('lodash');
const path      = require('path');
const fs        = require('fs');
const ttf2eot   = require('ttf2eot');
const ttf2woff  = require('ttf2woff');
const wawoff2   = require('wawoff2');
const svg2ttf   = require('svg2ttf');
const b64       = require('base64-js');
const rimraf    = promisify(require('rimraf'));
const mkdirp    = require('mkdirp');
const glob      = promisify(require('glob'));
const JSZip     = require('jszip');
const pug       = require('pug');
const ejs       = require('ejs');

const read      = promisify(fs.readFile);
const write     = promisify(fs.writeFile);
const rename    = promisify(fs.rename);
const unlink    = promisify(fs.unlink);
const execFile  = promisify(require('child_process').execFile);

const TEMPLATES_DIR = path.join(__dirname, '../../../../support/font-templates');
const TEMPLATES = {};
const SVG_FONT_TEMPLATE = ejs.compile(fs.readFileSync(path.join(TEMPLATES_DIR, 'font/svg.ejs'), 'utf8'));


_.forEach({
  'demo.ejs':              'demo.html',
  'css/css.ejs':           'css/${FONTNAME}.css',
  'css/css-ie7.ejs':       'css/${FONTNAME}-ie7.css',
  'css/css-codes.ejs':     'css/${FONTNAME}-codes.css',
  'css/css-ie7-codes.ejs': 'css/${FONTNAME}-ie7-codes.css',
  'css/css-embedded.ejs':  'css/${FONTNAME}-embedded.css',
  'LICENSE.ejs':           'LICENSE.txt',
  'css/animation.css':     'css/animation.css',
  'README.txt':            'README.txt'
}, (outputName, inputName) => {
  try {
    let inputFile = path.join(TEMPLATES_DIR, inputName);
    let inputData = fs.readFileSync(inputFile, 'utf8');
    let outputData;

    switch (path.extname(inputName)) {
      case '.pug': // Pug template.
        outputData = pug.compile(inputData, {
          pretty: true,
          filename: inputFile,
          filters: [ require('jstransformer-stylus') ]
        });
        break;

      case '.tpl': // Lodash template.
        outputData = _.template(inputData);
        break;

      case '.ejs': // EJS template.
        outputData = ejs.compile(inputData);
        break;

      default: // Static file - just do a copy.
        outputData = () => inputData;
        break;
    }

    TEMPLATES[outputName] = outputData;
  } catch (err) {
    throw new Error(`Unable to compile ${inputName}: ${err.message}`);
  }
});


module.exports = async function fontWorker(taskInfo) {
  let logPrefix = '[font::' + taskInfo.fontId + ']';
  let timeStart = Date.now();
  let fontname = taskInfo.builderConfig.font.fontname;
  let files;

  taskInfo.logger.info(`${logPrefix} Start generation: ${JSON.stringify(taskInfo.clientConfig)}`);


  // Collect file paths.
  //
  files = {
    config:      path.join(taskInfo.tmpDir, 'config.json'),
    svg:         path.join(taskInfo.tmpDir, 'font', `${fontname}.svg`),
    ttf:         path.join(taskInfo.tmpDir, 'font', `${fontname}.ttf`),
    ttfUnhinted: path.join(taskInfo.tmpDir, 'font', `${fontname}-unhinted.ttf`),
    eot:         path.join(taskInfo.tmpDir, 'font', `${fontname}.eot`),
    woff:        path.join(taskInfo.tmpDir, 'font', `${fontname}.woff`),
    woff2:       path.join(taskInfo.tmpDir, 'font', `${fontname}.woff2`)
  };


  // Generate initial SVG font.
  //
  /*eslint-disable new-cap*/
  let svgOutput = SVG_FONT_TEMPLATE(taskInfo.builderConfig);


  // Prepare temporary working directory.
  //
  await rimraf(taskInfo.tmpDir);
  await mkdirp(taskInfo.tmpDir);
  await mkdirp(path.join(taskInfo.tmpDir, 'font'));
  await mkdirp(path.join(taskInfo.tmpDir, 'css'));


  // Write clinet config and initial SVG font.
  //
  let configOutput = JSON.stringify(taskInfo.clientConfig, null, '  ');

  await write(files.config, configOutput, 'utf8');
  await write(files.svg, svgOutput, 'utf8');


  // Convert SVG to TTF
  //
  let ttf = svg2ttf(svgOutput, { copyright: taskInfo.builderConfig.font.copyright });

  await write(files.ttf, ttf.buffer);


  // Autohint the resulting TTF.
  //
  let max_segments = _.maxBy(taskInfo.builderConfig.glyphs, glyph => glyph.segments).segments;

  // KLUDGE :)
  // Don't allow hinting if font has "strange" glyphs.
  // That's useless anyway, and can hang ttfautohint < 1.0
  if (max_segments <= 500 && taskInfo.builderConfig.hinting) {
    await rename(files.ttf, files.ttfUnhinted);
    await execFile('ttfautohint', [
      '--no-info',
      '--symbol',
      // temporary workaround for #464
      // https://github.com/fontello/fontello/issues/464#issuecomment-202244651
      '--fallback-script=latn',
      files.ttfUnhinted,
      files.ttf
    ], { cwd: taskInfo.cwdDir });
    await unlink(files.ttfUnhinted);
  }


  // Read the resulting TTF to produce EOT and WOFF.
  //
  let ttfOutput = new Uint8Array(await read(files.ttf));


  // Convert TTF to EOT.
  //
  let eotOutput = ttf2eot(ttfOutput);

  await write(files.eot, eotOutput);


  // Convert TTF to WOFF.
  //
  let woffOutput = ttf2woff(ttfOutput);

  await write(files.woff, woffOutput);

  // Convert TTF to WOFF2.
  //
  let woff2Output = await wawoff2.compress(ttfOutput);

  await write(files.woff2, woff2Output);


  // Write template files. (generate dynamic and copy static)
  //
  let templatesNames = Object.keys(TEMPLATES);

  for (let i = 0; i < templatesNames.length; i++) {
    let templateName = templatesNames[i];
    let templateData = TEMPLATES[templateName];

    // don't create license file when no copyright data exists
    if ((templateName === 'LICENSE.txt') && (!taskInfo.builderConfig.fonts_list.length)) {
      continue;
    }

    let outputName = templateName.replace('${FONTNAME}', fontname);
    let outputFile = path.join(taskInfo.tmpDir, outputName);
    let outputData = templateData(taskInfo.builderConfig);

    outputData = outputData
                    .replace('%WOFF64%', b64.fromByteArray(woffOutput))
                    .replace('%TTF64%', b64.fromByteArray(ttfOutput));

    await write(outputFile, outputData, 'utf8');
  }

  //
  // Create zipball.
  //

  let archiveFiles = await glob(path.join(taskInfo.tmpDir, '**'), { nodir: true });
  let zip = new JSZip();

  for (var i = 0; i < archiveFiles.length; i++) {
    let fileData = await read(archiveFiles[i]);

    zip.folder(path.basename(taskInfo.tmpDir)).file(path.relative(taskInfo.tmpDir, archiveFiles[i]), fileData);
  }

  let zipData = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  // TODO: force tmp dir cleanup on fail

  // Remove temporary files and directories.
  //
  await rimraf(taskInfo.tmpDir);


  // Done.
  //
  let timeEnd = Date.now();

  taskInfo.logger.info(`${logPrefix} Generated in ${(timeEnd - timeStart) / 1000} ` +
                       `(real: ${(timeEnd - taskInfo.timestamp) / 1000})`);

  return zipData;
};
