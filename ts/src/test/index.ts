/*

A SIMPLE FILE WITH THE TEST METHODS

*/

import events = require ('events');
import fs = require ('fs');
import localIP = require('my-local-ip');
import jobManager = require('nslurm');
import stream = require('stream');
import util = require('util')


import du = require('./dualTask');
import {logger} from '../lib/logger';
import sim = require('./simpleTask');


/*
* USED TO test the simpletask : only one slot (one input)
* @management [literal] composed of 2 manadatory keys : 'jobManager' and 'jobProfile'
*/
export var simpleTest = function (inputFile, management) {
	//var uuid: string = "00000000-1111-2222-3333-444444444444"; // defined arbitrary but for tests

    var a = new sim.Simple(management);
    
    logger.log('DEBUG', a.input);
    logger.log('DEBUG', util.format(a));

    ///////////// pipeline /////////////

    //process.stdin.pipe(a.input); // {"input" : "toto"} for example

    //fileToStream(inputFile, "input", uuid).pipe(a.input)

    fileToStream(inputFile, "input").pipe(a.input)
    .on('processed', results => {
        logger.log('DEBUG', '**** data');
    })
    .on('err', (err, jobID) => {
        logger.log('ERROR', '**** ERROR');
    })
    .on('stderrContent', buf => {
        logger.log('ERROR', '**** STDERR');
    });

    a.pipe(process.stdout);

}


/*
* USED TO test the dualtask : with dual inputs (dual slots in task).
* WARNING  : to specify a namespace (uuid variable in this example), you have to add it only in
* one stream "input" (see lines where "fileToStream" is called).
*
* @management [literal] composed of 2 manadatory keys : 'jobManager' and 'jobProfile'
*/
export var dualTest = function (inputFile1, inputFile2, management) {
    var uuid: string = "00000000-1111-2222-3333-444444444444"; // defined arbitrary but for tests

    var a = new du.Dual(management, {'logLevel': 'info'});
    logger.log('DEBUG', util.format(a));
    
    ///////////// pipeline /////////////

    //process.stdin.pipe(a.input1); // {"input1" : "toto"} for example

    //fileToStream(inputFile1, "input1", uuid).pipe(a.input1) // if you want a namespace, add a uuid

    fileToStream(inputFile1, "input1").pipe(a.input1) // stream input 1
    fileToStream(inputFile2, "input2").pipe(a.input2) // stream input 2
    
    a.on('processed', results => {
        logger.log('DEBUG', '**** data');
    })
    .on('err', (err, jobID) => {
        logger.log('ERROR', '**** ERROR');
    })
    .on('stderrContent', buf => {
        logger.log('ERROR', '**** STDERR');
    });

    a.pipe(process.stdout);

}

/*
* Function to run jobManager.
* @opt [literal] contains the options to setup and start the JM. Key recognized by this method :
*     - bean [literal] like the file nslurm/config/arwenConf.json, optional
*     - optCacheDir [array] each element is a path to a previous cacheDir (for jobManager indexation), optional
*     - engineType [string] can be 'nslurm' for example, optional
*/
export var JMsetup = function (opt?: any): events.EventEmitter {
    let emitter = new events.EventEmitter();

    // @opt treatment
    if (! opt) { var opt: any = {}; }
    if (! opt.hasOwnProperty('optCacheDir')) opt['optCacheDir'] = null;
    if (! opt.hasOwnProperty('bean')) opt['bean'] = {};
    if (! opt.bean.hasOwnProperty('engineType')) opt.bean['engineType'] = 'emulator';
    if (! opt.bean.hasOwnProperty('cacheDir')) {
    	logger.log('WARNING', 'No cacheDir specified in opt.bean, so we take current directory');
    	opt.bean['cacheDir'] = process.cwd() + '/cacheDir';
    	try { fs.mkdirSync(opt.bean.cacheDir); }
    	catch (err) {
    		if (err.code !== 'EEXIST') throw err;
    	}
    }

    let startData: {} = {
        'cacheDir' : opt.bean.cacheDir,
        'tcp' : localIP(),
        'port' : '2467'
    }

    //jobManager.debugOn();

    jobManager.index(opt.optCacheDir); // optCacheDir can be null
    jobManager.configure({"engine" : opt.bean.engineType, "binaries" : opt.bean.binaries });
    jobManager.start(startData);

    jobManager.on('exhausted', function(){
        emitter.emit('exhausted', jobManager);
    });
    jobManager.on('ready', function() {
        emitter.emit('ready', jobManager);
    });
    return emitter;
}

/*
* Take a file @fi, put its content into a readable stream, in JSON format, with a @uuid if specified.
*/
export var fileToStream = function (fi: string, key: string, uuid?: string): stream.Readable {
    try {
        var content: string = fs.readFileSync(fi, 'utf8');
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
    } catch (err) {
        throw 'ERROR while opening the file ' + fi + ' :' + err;
    }
}



