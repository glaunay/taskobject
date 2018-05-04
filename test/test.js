"use strict";
/*
First time you use this script ? Use this :
    node /path/to/this/script/test.js -h
*/
Object.defineProperty(exports, "__esModule", { value: true });
const commander = require("commander");
const func = require("./index");
const logger_1 = require("../lib/logger");
var inputFile = null, inputFile2 = null;
//////////////// usage //////////////////
var usage = function () {
    let str = '\n\n  Examples:\n\n';
    str += '    For a simpletask (simple test):\n';
    str += '      node ./test/test.js\n';
    str += '        -f ./test/test.txt\n\n';
    str += '    For a dualtask (dual test):\n';
    str += '      node ./test/test.js\n';
    str += '        -f ./test/test.txt\n';
    str += '        -s ./test/test2.txt\n\n';
    console.log(str);
};
///////////// arguments /////////////
commander
    .usage('node ./test/test.js [options]        # in the taskobject directory')
    .description('A script for testing a simpletask or a dualtask')
    .on('--help', () => { usage(); })
    .option('-u, --usage', 'display examples of usages', () => { usage(); process.exit(); })
    .option('-f, --file <string>', 'path to your input file [mandatory]', (val) => { inputFile = val; })
    .option('-s, --secfile <string>', 'path to your second input file [mandatory only for a dual test]', (val) => { inputFile2 = val; })
    .parse(process.argv);
if (!inputFile)
    throw 'No input file specified ! Usage : ' + usage();
///////////// run /////////////
func.JMsetup()
    .on('ready', (myJM) => {
    let jobProfile = null; // "arwen_express" or "arwen_cpu" for example
    let management = {
        'jobManager': myJM,
        'jobProfile': jobProfile
    };
    if (!inputFile2)
        func.simpleTest(inputFile, management); // if no inputFile2 -> simple test
    else
        func.dualTest(inputFile, inputFile2, management); // if inputFile2 -> dual test
})
    .on('exhausted', () => {
    logger_1.logger.log('SUCCESS', "All jobs processed");
});
