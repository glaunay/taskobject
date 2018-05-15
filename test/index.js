"use strict";
/*

A SIMPLE FILE WITH THE TEST METHODS

*/
Object.defineProperty(exports, "__esModule", { value: true });
const events = require("events");
const fs = require("fs");
const localIP = require("my-local-ip");
const ms_jobManager = require("ms-jobmanager/build/nativeJS/job-manager-client");
const stream = require("stream");
const util = require("util");
const du = require("./dualtask");
const logger_1 = require("../lib/logger");
const sim = require("./simpletask");
/*
* USED TO test the simpletask : only one slot (one input)
* @management [literal] composed of 2 manadatory keys : 'jobManager' and 'jobProfile'
*/
exports.simpleTest = function (inputFile, management) {
    //var uuid: string = "00000000-1111-2222-3333-444444444444"; // defined arbitrary but for tests
    var a = new sim.simpletask(management);
    logger_1.logger.log('DEBUG', a.input);
    logger_1.logger.log('DEBUG', util.format(a));
    ///////////// pipeline /////////////
    //process.stdin.pipe(a.input); // {"input" : "toto"} for example
    //fileToStream(inputFile, "input", uuid).pipe(a.input)
    exports.fileToStream(inputFile, "input").pipe(a.input);
    a.on('processed', results => {
        logger_1.logger.log('DEBUG', '**** data');
    })
        .on('err', (err, jobID) => {
        logger_1.logger.log('ERROR', '**** ERROR');
    })
        .on('stderrContent', buf => {
        logger_1.logger.log('ERROR', '**** STDERR');
    });
    a.pipe(process.stdout);
};
/*
* USED TO test the dualtask : with dual inputs (dual slots in task).
* WARNING  : to specify a namespace (uuid variable in this example), you have to add it only in
* one stream "input" (see lines where "fileToStream" is called).
*
* @management [literal] composed of 2 manadatory keys : 'jobManager' and 'jobProfile'
*/
exports.dualTest = function (inputFile1, inputFile2, management) {
    //var uuid: string = "00000000-1111-2222-3333-444444444444"; // defined arbitrary but for tests
    var a = new du.dualtask(management, { 'logLevel': 'info' });
    logger_1.logger.log('DEBUG', util.format(a));
    ///////////// pipeline /////////////
    //process.stdin.pipe(a.input1); // {"input1" : "toto"} for example
    //fileToStream(inputFile1, "input1", uuid).pipe(a.input1) // if you want a namespace, add a uuid
    exports.fileToStream(inputFile1, "input1").pipe(a.input1); // stream input 1
    exports.fileToStream(inputFile2, "input2").pipe(a.input2); // stream input 2
    a.on('processed', results => {
        logger_1.logger.log('DEBUG', '**** data');
    })
        .on('err', (err, jobID) => {
        logger_1.logger.log('ERROR', '**** ERROR');
    })
        .on('stderrContent', buf => {
        logger_1.logger.log('ERROR', '**** STDERR');
    });
    a.pipe(process.stdout);
};
/*
* Function to run the jobManager.
*/
function JMsetup() {
    let emitter = new events.EventEmitter();
    let startData = {
        TCPip: localIP(),
        port: '2326'
    };
    startData['TCPip'] = 'localhost';
    console.log(startData);
    ms_jobManager.start(startData).on('ready', () => {
        emitter.emit('ready', ms_jobManager);
    });
    return emitter;
}
exports.JMsetup = JMsetup;
/*
* Take a file @fi, put its content into a readable stream, in JSON format, with a @uuid if specified.
*/
exports.fileToStream = function (fi, key, uuid) {
    try {
        var content = fs.readFileSync(fi, 'utf8');
        content = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        var s = new stream.Readable();
        s.push('{ "' + key + '" : "');
        s.push(content);
        if (uuid) {
            s.push('", "uuid" : "');
            s.push(uuid);
        }
        s.push('"}');
        s.push(null);
        return s;
    }
    catch (err) {
        throw 'ERROR while opening the file ' + fi + ' :' + err;
    }
};
