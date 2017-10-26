
import tk = require ('../index');

declare var __dirname;

var b_test = false;

export class Simple extends tk.Task {
	/*
	* Initialize the task parameters.
	*/
	public constructor (jobManager, jobProfile: {}, syncMode: boolean, options?: any) {
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
    protected prepareJob (inputs: {}[]): any {
        var modules: string[] = [];
        var exportVar: {} = {};
        return super.configJob(inputs, modules, exportVar);
    }

    /*
    * To manage the output(s)
    */
    protected prepareResults (chunk: any): string {
        if (typeof chunk !== 'string') chunk = JSON.stringify(chunk);
        var results: {} = {
            'out' : chunk
        };
        return JSON.stringify(results);
    }
}



