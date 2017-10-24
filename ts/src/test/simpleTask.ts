
import tk = require ('../index');

declare var __dirname;

var b_test = false;

export class Simple extends tk.Task {
	/*
	* Initialize the task parameters.
	*/
	constructor (jobManager, jobProfile: {}, syncMode: boolean, options?: any) {
		super(jobManager, jobProfile, syncMode, options);
        this.rootdir = __dirname;
        this.settFile = this.rootdir + '/../data/settings.json';
        super.__init__(this.settFile);
        this.staticTag = 'simple';
	}

    /*
    * Here are defined all the parameters specific to the task :
    *     - modules needed
    *     - variables to export in the batch script
    */
    prepareJob (inputs: {}[]): any {
        var modules: string[] = [];
        var exportVar: {} = {};
        return super.__configJob__(inputs, modules, exportVar);
    }

    /*
    * To manage the output(s)
    */
    prepareResults (chunk: any): string {
        if (typeof chunk !== 'string') chunk = JSON.stringify(chunk);
        var results: {} = {
            'out' : chunk
        };
        return JSON.stringify(results);
    }
}



