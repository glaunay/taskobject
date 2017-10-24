"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        if (typeof chunk !== 'string')
            chunk = JSON.stringify(chunk);
        var results = {
            'out': chunk
        };
        return JSON.stringify(results);
    }
}
exports.Simple = Simple;
