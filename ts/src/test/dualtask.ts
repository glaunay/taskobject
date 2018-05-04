
/*
*********************
***** DUAL TASK *****
*********************

* GOAL *
A dual example of a child Task, that could be chained by .pipe() or .superPipe()

* INPUT *
Coming from a readable stream, the input must be like :
{
    "input" : "pdb into string format"
}
WARNING : "input" is an mandatory key.

* OUTPUT *
The output is a literal with this form :
{
    "concatenated": "tototiti"
}

*/


/***** TODO *****
- doc
- mettre en place un commander et une fonction usage pour ce script au cas où

*/


import tk = require ('../index');
import typ = require('../types/index');

declare var __dirname;

export class dualtask extends tk.Task {
    public readonly input1;
    public readonly input2;

	/*
	* Initialize the task parameters.
	*/
	public constructor (management: typ.management, options?: any) {
		super(management, options); // constructor of the tk.Task Object
        this.rootdir = __dirname; // always take the current directory of the task...
        this.coreScript = this.rootdir + '/../data/dual.sh'; // the bash script (core of the Task)
        
        /* Creation of the slot symbols : only one here */
        this.slotSymbols = ['input1', 'input2'];

        super.initSlots(); // always init the Slots
	}



    /*
    * Here manage the input(s)
    */
    protected prepareJob (inputs: typ.stringMap[]): typ.jobOpt {
        return super.configJob(inputs);
    }

    /*
    * To manage the output(s).
    * Remark : we don't want the 'concatenated' key in the out going JSON.
    */
    protected prepareResults (chunkJson: typ.stringMap): typ.stringMap {
        if (! typ.isStringMap(chunkJson)) throw 'ERROR : @chunkJson must be a string map !';
        return {
            [this.outKey] : chunkJson.concatenated
        };
    }
}

