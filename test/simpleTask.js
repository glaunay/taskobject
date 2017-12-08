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
class Simple extends tk.Task {
    /*
    * Initialize the task parameters.
    */
    constructor(management, syncMode, options) {
        super(management, syncMode, options);
        this.rootdir = __dirname;
        this.settFile = this.rootdir + '/../data/settings.json';
        super.init(this.settFile);
        this.staticTag = 'simple';
    }
    /*
    * Here manage the input(s)
    */
    prepareJob(inputs) {
        return super.configJob(inputs);
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
