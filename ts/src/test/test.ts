/*
First time you use this script ? Use this :
    node /path/to/this/script/test.js -h
*/

import commander = require('commander');
import jsonfile = require('jsonfile');

import func = require('./index');

var cacheDir: string = null,
    bean: any = null,
    inputFile: string = null,
    inputFile2: string = null,
    b_index: boolean = false;
var optCacheDir: string[] = [];


//////////////// usage //////////////////
var usage = function (): string {
    let str: string = '\n\n  Examples:\n\n'
    str += '    For a simpletask (simple test):\n';
    str += '      node ./test/test.js\n';
    str += '        -d /home/mgarnier/tmp/\n';
    str += '        -c ./node_modules/nslurm/config/arwenConf.json\n';
    str += '        -f ./test/test.txt\n\n';
    str += '    For a dualtask (dual test):\n';
    str += '      node ./test/test.js\n';
    str += '        -d /home/mgarnier/tmp/\n';
    str += '        -c ./node_modules/nslurm/config/arwenConf.json\n';
    str += '        -f ./test/test.txt\n';
    str += '        -s ./test/test2.txt\n\n';
    return str;
}


///////////// arguments /////////////
commander
    .usage('node ./test/test.js [options]        # in the taskobject directory')
    .description('A script for testing a simpletask or a dualtask')
    .on('--help', () => { console.log(usage()); })
    .option('-u, --usage', 'display examples of usages',
        () => { console.log(usage()); process.exit(); })
    .option('-d, --dircache <string>', 'path to cache directory used by the JobManager [optional if -c]',
        (val) => { cacheDir = val; })
    .option('-c, --config <string>', 'path to the cluster config file for the JobManager [optional if emulation]',
        (val) => { try {
            bean = jsonfile.readFileSync(val);
        } catch (err) {
            console.log('ERROR while reading the config file :');
            console.log(err)
        } })
    .option('-f, --file <string>', 'path to your input file [mandatory]',
        (val) => { inputFile = val; })
    .option('-s, --secfile <string>', 'path to your second input file [mandatory only for a dual test]',
        (val) => { inputFile2 = val; })
    .option('-i, --index', 'allow indexation of the cache directory of the JobManager [optional]',
        () => { b_index = true; })
    .parse(process.argv);


if (! inputFile) throw 'No input file specified ! Usage : ' + usage();
if (! bean) throw 'No config file specified ! Usage : ' + usage();
if (! bean.hasOwnProperty('cacheDir') && ! cacheDir) throw 'No cacheDir specified ! Usage : ' + usage();


///////////// management /////////////
bean.cacheDir = cacheDir ? cacheDir : bean.cacheDir; // priority for line command argument

if (b_index) optCacheDir.push(bean.cacheDir);
else optCacheDir = null;

let opt: {} = {
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

    if (!inputFile2) func.simpleTest(inputFile, management); // if no inputFile2 -> simple test
    else func.dualTest(inputFile, inputFile2, management); // if inputFile2 -> dual test
})
.on('exhausted', () => {
    console.log("All jobs processed");
});

