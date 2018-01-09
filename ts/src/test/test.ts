/// <reference path="../../typings/index.d.ts" />

/*
TO RUN :
node /path/to/this/script/test.js -cache /path/to/cache/tmp/ [optional if -conf]
                                -conf /path/to/nslurm/config/arwenConf.json [not necessary if --emul]
                                -file /path/to/your/file.txt
                                --index // to allow indexation of the cache directory of nslurm [optional]
*/


import jsonfile = require ('jsonfile');
import func = require('./index');

var cacheDir: string = null,
    bean: any = null,
    inputFile: string = null,
    b_index: boolean = false;
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


///////////// management /////////////
bean.cacheDir = cacheDir ? cacheDir : bean.cacheDir; // priority for line command argument

if (b_index) optCacheDir.push(bean.cacheDir);
else optCacheDir = null;

let opt: {} = {
    'engineType' : bean.engineType,
    'bean' : bean,
    'optCacheDir' : optCacheDir
}


///////////// run /////////////
func.JMsetup(opt)
.on('ready', (myJM) => {
    let jobProfile = null; // "arwen_express" or "arwen_cpu" for example
    let management = {
        'jobManager' : myJM,
        'jobProfile' : jobProfile
    }
    func.simpleTest(inputFile, management);
})
.on('exhausted', () => {
    console.log("All jobs processed");
});

