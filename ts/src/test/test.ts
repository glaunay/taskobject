/// <reference path="../../typings/index.d.ts" />

/*
TO RUN :
node /path/to/this/script/test.js -cache /path/to/cache/tmp/
                                -conf /path/to/nslurm/config/arwenConf.json
                                -file /path/to/your/file.txt
*/

import sim = require ('./simpleTask');
import jobManager = require ('nslurm'); // engineLayer branch
import localIP = require ('my-local-ip');
import jsonfile = require ('jsonfile');
import fs = require ('fs');
import stream = require ('stream');

var tcp = localIP(),
    port: string = "2220";
var uuid: string = "67593282-c4a4-4fd0-8861-37d8548ce236";
var engineType: string = null,
    cacheDir: string = null,
    bean: any = null,
    entryFile: string = null;
var optCacheDir: string[] = [];


var fileToStream = function (entryFile: string): stream.Readable {
    try {
        var content: string = fs.readFileSync(entryFile, 'utf8');
        content = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        var s = new stream.Readable();
        s.push('{ "input" : "');
        s.push(content);
        s.push('", "uuid" : "');
        s.push(uuid);
        s.push('"}');
        s.push(null);
        return s;
    } catch (err) {
        throw 'ERROR while opening the file ' + entryFile + ' :' + err;
    }
}


///////////// arguments /////////////
process.argv.forEach(function (val, index, array){
    if (val === '-cache') {
        if (! array[index + 1]) throw("usage : ");
        cacheDir = array[index + 1];
    }
    if (val === '-conf') {
        if (! array[index + 1]) throw("usage : ");
        try {
            bean = jsonfile.readFileSync(array[index + 1]);
        } catch (err) {
            console.log('ERROR while reading the config file :');
            console.log(err)
        }
    }
    if (val === '-file') {
        if (! array[index + 1]) throw 'usage : ';
        entryFile = array[index + 1];
    }
});
if (! cacheDir) throw 'No cacheDir specified !';
// example CACHEDIR = /home/mgarnier/tmp
if (! bean) throw 'No config file specified !';
// example BEAN = /home/mgarnier/taskObject_devTests/node_modules/nslurm/config/arwenConf.json
if (! entryFile) throw 'No entry file specified !';
// example ENTRYFILE = ./test/test.txt


engineType = engineType ? engineType : bean.engineType;
bean.cacheDir = cacheDir ? cacheDir : bean.cacheDir;
// console.log("Config file content:\n");
// console.dir(bean);

optCacheDir.push(bean.cacheDir);


///////////// jobManager /////////////
//jobManager.debugOn();
jobManager.index(optCacheDir);
jobManager.configure({"engine" : engineType, "binaries" : bean.binaries });

jobManager.start({
    'cacheDir' : bean.cacheDir,
    'tcp' : tcp,
    'port' : port
});
jobManager.on('exhausted', function(){
    console.log("All jobs processed");
});
jobManager.on('ready', function() {
    simpleTest();
});


//////////// tests /////////////
var simpleTest = function () {
    var jobProfile: string = null; // "arwen_express" or "arwen_cpu" for example
    var syncMode: boolean = true;

    var a = new sim.Simple (jobManager, jobProfile, syncMode);
    //a.testMode(true);
    var b = new sim.Simple (jobManager, jobProfile, syncMode); // for superPipe() tests
    //b.testMode(true);

    // pipeline
    //process.stdin.pipe(a); // {"input" : "toto"} for example
    fileToStream(entryFile).pipe(a)
    .on('processed', results => {
    	console.log('**** data');
    })
    .on('err', (err, jobID) => {
    	console.log('**** ERROR');
    })
    .superPipe(b)
    .on('processed', results => {
        console.log('**** data 22222');
    })
    .on('err', (err, jobID) => {
        console.log('**** ERROR 22222');
    })
    .pipe(process.stdout);

}

