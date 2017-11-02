"use strict";
/*
***********************
***** SIMPLE TASK *****
***********************

* GOAL *
A simple example of a child Task, that could be chained by .pipe() or .superPipe()

* INPUT *
Coming from a readable stream, the input must be like :
{
    "input" : "pdb into string format"
}
WARNING : "input" is an obligatory key.
(see the ./test/entry.json for an example)

* OUTPUT *
The output is a literal with this form :
{
    "input" : '{\n"myData line 1" : "toto"\n}\n'
}
*/
Object.defineProperty(exports, "__esModule", { value: true });
// TODO
// - doc
// - git
// - npm
const tk = require("../index");
var b_test = false;
class Simple extends tk.Task {
    /*
    * Initialize the task parameters.
    */
    constructor(jobManager, jobProfile, syncMode, options) {
        super(jobManager, jobProfile, syncMode, options);
        this.rootdir = __dirname;
        this.settFile = this.rootdir + '/../data/settings.json';
        super.init(this.settFile);
        this.staticTag = 'simple';
    }
    /*
    * Here are defined all the parameters specific to the task :
    *     - modules needed
    *     - variables to export in the batch script
    */
    prepareJob(inputs) {
        var modules = [];
        var exportVar = {};
        return super.configJob(inputs, modules, exportVar);
    }
    /*
    * To manage the output(s)
    */
    prepareResults(chunk) {
        var results = {
            'input': chunk
        };
        return results;
    }
}
exports.Simple = Simple;