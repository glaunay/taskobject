/// <reference path="../../typings/index.d.ts" />

/*
TO RUN :
node /path/to/this/script/test.js -cache /path/to/cache/tmp/ [optional if -conf]
                                -conf /path/to/nslurm/config/arwenConf.json [not necessary if --emul]
                                -file /path/to/your/file.txt
                                --index // to allow indexation of the cache directory of nslurm [optional]
*/

import sim = require ('./simpleTask');
import localIP = require ('my-local-ip');
import jsonfile = require ('jsonfile');
import fs = require ('fs');
import jobManager = require ('nslurm'); // engineLayer branch
import stream = require ('stream');

var tcp = localIP(),
    port: string = "2220";
var uuid: string = "67593282-c4a4-4fd0-8861-37d8548ce236";
var engineType: string = null,
    cacheDir: string = null,
    bean: any = null,
    inputFile: string = null,
    b_index: boolean = false,
    options: {} = null;
var optCacheDir: string[] = [];


//////////////// usage //////////////////
var usage = function (): void {
    let str: string = '\n\n********** Test file to run a SimpleTask **********\n\n';
    str += 'DATE : 2017.12.19\n\n';
    str += 'USAGE : (in the TaskObject directory)\n';
    str += 'node test/test.js\n';
    str += '    -u, to have help\n';
    str += '    -cache [PATH_TO_CACHE_DIRECTORY_FOR_NSLURM], [optional if -conf]\n';
    str += '    -conf [PATH_TO_THE_CLUSTER_CONFIG_FILE_FOR_NSLURM], [not necessary if --emul]\n';
    str += '    -file [PATH_TO_YOUR_INPUT_FILE]\n';
    str += '    --index, to allow indexation of the cache directory of nslurm [optional]\n';
    str += 'EXAMPLE :\n';
    str += 'node test/test.js\n';
    str += '    -cache /home/mgarnier/tmp/\n';
    str += '    -conf /home/mgarnier/taskObject_devTests/node_modules/nslurm/config/arwenConf.json\n';
    str += '    -file ./test/test.txt\n\n';
    str += '**************************************************\n\n';
    console.log(str);
}



//////////// functions /////////////
var simpleTest = function (management) {
    let syncMode: boolean = true;

    var a = new sim.Simple (management, syncMode);
    //a.testMode(true);
    var b = new sim.Simple (management, syncMode); // for superPipe() tests
    //b.testMode(true);

    // pipeline
    //process.stdin.pipe(a); // {"input" : "toto"} for example
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
    .superPipe(b)
    .on('processed', results => {
        console.log('**** data 22222');
    })
    .on('err', (err, jobID) => {
        console.log('**** ERROR 22222');
    })
    .on('stderrContent', buf => {
        console.log('**** STDERR 22222');
    })
    .pipe(process.stdout);

}

var fileToStream = function (fi: string): stream.Readable {
    try {
        var content: string = fs.readFileSync(fi, 'utf8');
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
        throw 'ERROR while opening the file ' + fi + ' :' + err;
    }
}


///////////// arguments /////////////
process.argv.forEach(function (val, index, array){
    if (val == '-u') {
        console.log(usage());
        process.exit();
    }
    if (val === '-cache') {
        if (! array[index + 1]) throw 'usage : ' + usage();
        cacheDir = array[index + 1];
    }
    if (val === '-conf') {
        if (! array[index + 1]) throw 'usage : ' + usage();
        try {
            bean = jsonfile.readFileSync(array[index + 1]);
        } catch (err) {
            console.log('ERROR while reading the config file :');
            console.log(err)
        }
    }
    if (val === '-file') {
        if (! array[index + 1]) throw 'usage : ' + usage();
        inputFile = array[index + 1];
    }
    if (val === '--index') {
        b_index = true;
    }
});
if (! inputFile) throw 'No input file specified ! Usage : ' + usage();
if (! bean) throw 'No config file specified ! Usage : ' + usage();
if (! bean.hasOwnProperty('cacheDir') && ! cacheDir) throw 'No cacheDir specified ! Usage : ' + usage();

engineType = engineType ? engineType : bean.engineType;
bean.cacheDir = cacheDir ? cacheDir : bean.cacheDir;

optCacheDir.push(bean.cacheDir);


///////////// management /////////////
options = {
    'cacheDir' : bean.cacheDir,
    'tcp' : tcp,
    'port' : port
}

///////////// jobManager /////////////
let jobProfile: string = null; // "arwen_express" or "arwen_cpu" for example
let management: {} = {
    'jobManager' : jobManager,
    'jobProfile' : jobProfile
}
//jobManager.debugOn();

if (b_index) jobManager.index(optCacheDir);
else jobManager.index(null);

jobManager.configure({"engine" : engineType, "binaries" : bean.binaries });

jobManager.start(options);
jobManager.on('exhausted', function(){
    console.log("All jobs processed");
});
jobManager.on('ready', function() {
    simpleTest(management);
});




