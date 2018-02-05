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
    * To manage the output(s).
    * The "input" key is necessary to run correctly in case of simpleTask_1.pipe(simpleTask_2)
    * because results.input of simpleTask_1 will be used as inputs.input for simpleTask_2. In fact,
    * the coreScript needs an "$input" variable (specified by the sbatch script, thanks to the JM).
    */
    prepareResults(chunk) {
        var results = {
            'input': chunk
        };
        return results;
    }
}
exports.Simple = Simple;
