/*

A SIMPLE FILE WITH THE TEST METHODS

*/

import events = require ('events');
import fs = require ('fs');
import jobManager = require ('nslurm');
import localIP = require ('my-local-ip');
import sim = require ('./simpleTask');
import stream = require ('stream');


/*
* @management [literal] composed of 2 manadatory keys : 'jobManager' and 'jobProfile'
*/
export var simpleTest = function (inputFile, management) {
	//var uuid: string = "67593282-c4a4-4fd0-8861-37d8548ce236"; // defined arbitrary but for tests
    let syncMode: boolean = true;

    var a = new sim.Simple (management, syncMode);
    //a.testMode(true);
    //var b = new sim.Simple (management, syncMode); // for superPipe() tests
    //b.testMode(true);

    // pipeline
    //process.stdin.pipe(a); // {"input" : "toto"} for example
    //fileToStream(inputFile, uuid).pipe(a)
    fileToStream(inputFile).pipe(a)
    .on('processed', results => {
        console.log('**** data');
    })
    .on('err', (err, jobID) => {
        console.log('**** ERROR');
    })
    .on('stderrContent', buf => {
        console.log('**** STDERR');
    })
    // .superPipe(b)
    // .on('processed', results => {
    //     console.log('**** data 22222');
    // })
    // .on('err', (err, jobID) => {
    //     console.log('**** ERROR 22222');
    // })
    // .on('stderrContent', buf => {
    //     console.log('**** STDERR 22222');
    // })
    .pipe(process.stdout);

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
    	console.log('No cacheDir specified in opt.bean, so we take current directory');
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
* Take a file @fi, put its content into a readable stream with a @uuid is specified.
*/
export var fileToStream = function (fi: string, uuid?: string): stream.Readable {
    try {
        var content: string = fs.readFileSync(fi, 'utf8');
        content = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        var s = new stream.Readable();
        s.push('{ "input" : "');
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



