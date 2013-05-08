'use strict';


var _          = require('lodash');
var os         = require('os');
var path       = require('path');
var fs         = require('fs');
var fstools    = require('fs-tools');
var execFile   = require('child_process').execFile;
var async      = require('async');
var crypto     = require('crypto');
var fontConfig = require('./font_config');
var serverConfig  = require('../../../lib/embedded_fonts/server_config');


// State control variables. Initialized at first use.
//
var builderInitialized = false;
var builderVersion     = null;
var builderLogger      = null;
var builderCwdDir      = null;
var builderTmpDir      = null;
var builderOutputDir   = null;
var builderBinary      = null;
var builderQueue       = null;
var builderTasks       = null;


// Returns unique identifier for requested list of glyphs.
//
function getFontId(config) {
  var hash = crypto.createHash('md5');

  hash.update('fontello' + builderVersion);
  hash.update(JSON.stringify(config));

  return hash.digest('hex');
}


function getOutputName(fontId) {
  var firstDir  = fontId.substr(0, 2)
    , secondDir = fontId.substr(2, 2);

  return path.join(firstDir, secondDir, (fontId + '.zip'));
}


var svgFontTemplate = _.template(
    '<?xml version="1.0" standalone="no"?>\n' +
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
    '<svg xmlns="http://www.w3.org/2000/svg">\n' +
    '<metadata><%= metadata %></metadata>\n' +
    '<defs>\n' +
    '<font id="<%= font.fontname %>" horiz-adv-x="<%= fontHeight %>" >\n' +

    '<font-face' +
      ' font-family="font.familyname"' +
      ' font-weight="400"' +
      ' font-stretch="normal"' +
      ' units-per-em="<%= fontHeight %>"' +
      //panose-1="2 0 5 3 0 0 0 0 0 0"
      ' ascent="<%= font.ascent %>"' +
      ' descent="<%= font.descent %>"' +
      //bbox="-1.33333 -150.333 1296 850"
      //underline-thickness="50"
      //underline-position="-100"
      //unicode-range="U+002B-1F6AB"
    ' />\n' +

    '<missing-glyph horiz-adv-x="<%= fontHeight %>" />\n' +

    '<% _.forEach(glyphs, function(glyph) { %>' +
      '<glyph' +
        ' glyph-name="<%= glyph.css %>"' +
        ' unicode="<%= glyph.unicode %>"' +
        ' d="<%= glyph.d %>"' +
        ' horiz-adv-x="<%= glyph.width %>"' +
      ' />\n' +
    '<% }); %>' +

    '</font>\n' +
    '</defs>\n' +
    '</svg>'
  );


// Working procedure for the builder queue.
//
function handleTask(taskInfo, callback) {
  var logPrefix = '[font::' + taskInfo.fontId + ']'
    , timeStart = Date.now()
    , workplan  = [];

  builderLogger.info('%s Start generation: %j', logPrefix, taskInfo.clientConfig);

  /////// create SVG font first ////////////////////////////////////////////////

  var glyphs = [];
  var font = taskInfo.builderConfig.font;

  _.forEach(taskInfo.builderConfig.glyphs, function (glyph)  {
    var uid = glyph.uid;
    glyphs.push({
      heigh : serverConfig.uids[uid].svg.height,
      width : serverConfig.uids[uid].svg.width,
      d     : serverConfig.uids[uid].svg.d,
      css   : glyph.css,
      unicode : '&#x' + glyph.code.toString(16) + ';'
    });
  });

  var svgOut = svgFontTemplate({
    font : font,
    glyphs : glyphs,
    metadata: font.copyright,
    fontHeight : font.ascent - font.descent
  });

  //////////////////////////////////////////////////////////////////////////////

  //
  // Prepare the workplan.
  //
  workplan.push(async.apply(fstools.remove, taskInfo.tmpDir));
  workplan.push(async.apply(fstools.mkdir, taskInfo.tmpDir));
  workplan.push(async.apply(fs.writeFile,
                            path.join(taskInfo.tmpDir, 'font.svg'),
                            svgOut,
                            'utf8'));
  workplan.push(async.apply(fs.writeFile,
                            path.join(taskInfo.tmpDir, 'config.json'),
                            JSON.stringify(taskInfo.clientConfig, null, '  '),
                            'utf8'));

  workplan.push(async.apply(fs.writeFile,
                            path.join(taskInfo.tmpDir, 'generator-config.json'),
                            JSON.stringify(taskInfo.builderConfig, null, '  '),
                            'utf8'));

  workplan.push(async.apply(execFile,
                            builderBinary,
                            [ taskInfo.builderConfig.font.fontname, taskInfo.tmpDir, taskInfo.output ],
                            { cwd: builderCwdDir }));

  workplan.push(async.apply(fstools.remove, taskInfo.tmpDir));

  //
  // Execute the workplan.
  //
  async.series(workplan, function (err) {
    if (err) {
      builderLogger.error('%s %s', logPrefix, err.stack || err.message || err.toString());
      callback(err);
      return;
    }

    var timeEnd = Date.now();

    builderLogger.info('%s Generated in %dms (real: %dms)',
                       logPrefix,
                       (timeEnd - timeStart) / 1000,
                       (timeEnd - taskInfo.timestamp) / 1000);
    callback();
  });
}


// (internal) Push new font building task into queue and return
// `fontId`. Make sure, that task is not duplicated. If we can
// return result immediately - do it.
// 
function createTask(clientConfig, afterRegistered, afterComplete) {
  var builderConfig = fontConfig(clientConfig)
    , fontId        = getFontId(builderConfig)
    , outputName    = getOutputName(fontId)
    , outputFile    = path.join(builderOutputDir, outputName)
    , taskInfo      = null;

  if (!builderConfig || 0 >= builderConfig.glyphs.length) {
    if (afterRegistered) {
      afterRegistered('Invalid config.');
    }
    if (afterComplete) {
      afterComplete('Invalid config.');
    }
    return;
  }

  //
  // If task already exists - just register a new callback on it.
  //
  if (_.has(builderTasks, fontId)) {
    builderLogger.info('Job is already in queue: %j', {
      font_id:      fontId
    , queue_length: Object.keys(builderTasks).length
    });

    taskInfo = builderTasks[fontId];

    if (afterRegistered) {
      afterRegistered(null, fontId);
    }
    if (afterComplete) {
      taskInfo.callbacks.push(afterComplete);
    }
    return;
  }

  //
  // If same task is already done (the result file exists) - use it.
  //
  fs.exists(outputFile, function (exists) {
    if (exists) {
      if (afterRegistered) {
        afterRegistered(null, fontId);
      }
      if (afterComplete) {
        afterComplete(null, fontId);
      }
      return;
    }

    //
    // Otherwise, create a new task.
    //
    taskInfo = {
      fontId:        fontId
    , clientConfig:  clientConfig
    , builderConfig: builderConfig
    , tmpDir:        path.join(builderTmpDir, 'fontello-' + fontId)
    , output:        outputFile
    , timestamp:     Date.now()
    , callbacks:     []
    };

    if (afterComplete) {
      taskInfo.callbacks.push(afterComplete);
    }

    builderTasks[fontId] = taskInfo;
    builderQueue.push(taskInfo, function (err) {
      var callbacks = builderTasks[fontId].callbacks;

      delete builderTasks[fontId];

      callbacks.forEach(function (func) {
        func(err, outputName, builderOutputDir);
      });
    });

    builderLogger.info('New job created: %j', {
      font_id:      fontId
    , queue_length: Object.keys(builderTasks).length
    });

    if (afterRegistered) {
      afterRegistered(null, fontId);
    }
  });
}


// Push new build task (config) to queue
// and return `fontId` immediately (via callback)
//
function pushFont(clientConfig, callback) {
  createTask(clientConfig, callback, null);
}


// Push new build task (config) to queue
// and return `fontId` when compleete (via callback)
//
function buildFont(clientConfig, callback) {
  createTask(clientConfig, null, callback);
}


// Check if font generation complete. Returns
//
// {
//   pending,   // true if still in queue
//   file,      // file path from download root
//   directory  // dowload root
// }
//
function checkFont(fontId, callback) {

  // Check task pool first, to avoid fs kick
  // & make sure that file not partially written
  // 
  if (_.has(builderTasks, fontId)) {
    callback(null, { pending: true });
    return;
  }

  // Ok, we have chance. Check if result exists on disk
  var filename = getOutputName(fontId)
    , filepath = path.join(builderOutputDir, filename);

  fs.exists(filepath, function (exists) {
    if (exists) {
      callback(null, { pending : false, file: filename, directory: builderOutputDir });
    } else {
      callback(null, null);
    }
  });
}

// Init internals. Must be called prior builder use.
//
function setup(N) {
  var builderConcurrency = N.config.options.builder_concurrency || os.cpus().length;

  builderVersion   = N.runtime.version;
  builderLogger    = N.logger.getLogger('font');
  builderTmpDir    = path.join(os.tmpDir(), 'fontello');
  builderCwdDir    = N.runtime.mainApp.root;
  builderOutputDir = path.join(N.runtime.mainApp.root, 'public', 'download');
  builderBinary    = path.join(N.runtime.mainApp.root, 'bin', 'generate_font.sh');
  builderQueue     = async.queue(handleTask, builderConcurrency);
  builderTasks     = {};

  builderInitialized = true;
}


module.exports = function (N) {
  if (!builderInitialized) {
    setup(N);
  }

  return {
    pushFont:  pushFont
  , buildFont: buildFont
  , checkFont: checkFont
  };
};
