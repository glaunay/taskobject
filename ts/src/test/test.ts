/// <reference path="../../typings/index.d.ts" />

/*
TO RUN :
node /path/to/this/script/test.js -cache /path/to/cache/tmp/ -conf /path/to/nslurm/config/arwenConf.json
*/

import sim = require ('./simpleTask');
import tk = require ('../index');
import jobManager = require ('nslurm'); // engineLayer branch of course
import localIP = require ('my-local-ip');
import jsonfile = require ('jsonfile');

var tcp = localIP(), port = "2220";
var engineType = null, cacheDir = null, bean = null;
var optCacheDir = [];


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
});
if (! cacheDir) throw 'No cacheDir specified !';
// example CACHEDIR = /home/mgarnier/tmp
if (! bean) throw 'No config file specified !';
// example BEAN = /home/mgarnier/taskObject_devTests/node_modules/nslurm/config/arwenConf.json

engineType = engineType ? engineType : bean.engineType;
bean.cacheDir = cacheDir ? cacheDir : bean.cacheDir;
console.log("Config file content:\n");
console.dir(bean);

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
    var jobProfile = null; // "arwen_express" or "arwen_cpu" for example
    var syncMode = true;
    var entryFile = __dirname + "/entry.json";

    var a = new sim.Simple (jobManager, jobProfile, syncMode);
    //a.testMode(true);
    var b = new sim.Simple (jobManager, jobProfile, syncMode); // for reading tests


    // pipeline
    //process.stdin.pipe(a); // {"input" : "toto"} for example
    tk.readEntry(entryFile).pipe(a)
    .on('processed', s => {
    	console.log('**** data');
    })
    .on('err', s => {
    	console.log('**** ERROR');
    })
    .superPipe(b)
    .on('processed', s => {
        console.log('**** data 22222');
    })
    .on('err', s => {
        console.log('**** ERROR 22222');
    })
    .pipe(process.stdout);

}

