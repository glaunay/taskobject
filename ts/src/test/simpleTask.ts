
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


// TODO
// - doc
// - git
// - npm


import tk = require ('../index');

declare var __dirname;

var b_test = false;

export class Simple extends tk.Task {
	/*
	* Initialize the task parameters.
	*/
	public constructor (jobManager, jobProfile: string, syncMode: boolean, options?: any) {
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
    protected prepareJob (inputs: any[]): any {
        var modules: string[] = [];
        var exportVar: {} = {};
        return super.configJob(inputs, modules, exportVar);
    }

    /*
    * To manage the output(s)
    */
    protected prepareResults (chunk: string): {} {
        var results: {} = {
            'input' : chunk
        };
        return results;
    }
}



