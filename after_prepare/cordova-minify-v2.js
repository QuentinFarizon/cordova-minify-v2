#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    UglifyJS = require('uglify-js'),

    debug = false,

    successCounter = 0,
    errorCounter = 0,
    notProcessedCounter = 0,
    pendingCounter = 0,

    hasStartedProcessing = false


function processFiles(dir, _noRecursive) {
    console.log('Dir : ' + dir)
    fs.readdir(dir, function (err, list) {
        if (err) {
            // console.error('processFiles - reading directories error: ' + err);
            return;
        }
        list.forEach(function(file) {
            file = path.join(dir, file);
            console.log('Processing ' + file)
            fs.stat(file, function(err, stat) {
                hasStartedProcessing = true;
                if (stat.isDirectory()) {
                    if (!_noRecursive) processFiles(file);
                } else {
                    compress(file, dir);
                }
            });
        });
    });
}

function compress(file, dir) {
    var ext = path.extname(file);
    switch(ext.toLowerCase()) {
        case '.js':
            (debug) && console.log('Compressing/Uglifying JS File: ' + file);
            if (file.includes('cordova-plugin-ble-central/www/ble.js')) {
                // TODO Uglify-js does not manage ES6 files
                // TODO terser does, but it has a different API
                // TODO https://www.npmjs.com/package/terser
                (debug) && console.log('Skipped (ES6): ' + file);
                break;
            }
            var result = UglifyJS.minify(file, {
                compress: {
                    dead_code: true,
                    loops: true,
                    if_return: true,
                    keep_fargs: true,
                    keep_fnames: true
                }
            });
            if (!result || !result.code || result.code.length == 0) {
                errorCounter++;
                console.error('\x1b[31mEncountered an error minifying a file: %s\x1b[0m', file);
            }
            else {
                successCounter++;
                fs.writeFileSync(file, result.code, 'utf8');
                (debug) && console.log('Optimized: ' + file);
            }
            break;
        default:
            console.error('Encountered file with ' + ext + ' extension - not compressing.');
            notProcessedCounter++;
            break;
    }
}

function checkIfFinished() {
    if (hasStartedProcessing && pendingCounter == 0) {
        console.log('\x1b[36m%s %s %s\x1b[0m', successCounter + (successCounter == 1 ? ' file ' : ' files ') + 'minified.', errorCounter + (errorCounter == 1 ? ' file ' : ' files ') + 'had errors.', notProcessedCounter + (notProcessedCounter == 1 ? ' file was ' : ' files were ') + 'not processed.');
    } else {
        setTimeout(checkIfFinished, 10);
    }
}

module.exports = function(context) {
    console.log('cordova-minify STARTING - minifying your js, css, html, and images. Sit back and relax!');

    for (const platform of context.opts.platforms) {
        switch (platform) {
            case 'android':
            {
                const path_ = path.join("platforms", "android", "app", "src", "main", "assets", "www", "plugins");
                processFiles(path_, false);
            }
            break;
            case 'ios':
            {
                const path_ = path.join("platforms", "ios", "www", "plugins");
                processFiles(path_, false);
            }
            break;
            default:
                console.error('Hook currently supports only Android and iOS : ' + context.opts.platforms.join(', '));
                return;
        }
    }

    checkIfFinished();
}
