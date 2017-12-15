/*
* CLASS TASK
* settFile must be like :
{
	"coreScript": "./data/simple.sh",
	"automaticClosure": false,
	"settings": {}
}


* Usage :
var tk = require('taskObject');
var taskTest = new tk.Task (jobManager, jobProfile, syncMode);
readableStream.pipe(taskTest).pipe(writableStream);


* Inheritance :
A child class of Task must not override methods with a "DO NOT MODIFY" indication


*/


// TODO
// - doc
// - NPM
// - create a run method that does not need a jobManager
// - kill() method (not necessary thanks to the new jobManager with its "engines")
// - pushClosing() method : if @chunk receive a null value
// - init() method : arguments nommés (soit un JSON soit un string)


import childPro = require('child_process');
import events = require ('events');
import fs = require ('fs');
import JSON = require ('JSON');
import jsonfile = require ('jsonfile');
import stream = require ('stream');
import uuid = require('uuid/v4');


declare var __dirname;

export abstract class Task extends stream.Duplex {
	protected b_test: boolean = false; // test mode
	private readonly jobManager: any = null; // job manager (engineLayer version)
	private readonly jobProfile: string = null; // "arwen_express" for example (see the different config into nslurm module)
	private readonly emulOptions: any = {}; // options for job emulation (if no jobManager)
	private readonly runFunc: Function = this.run; // function used to run (this.emulate if no jobManager)
	private readonly syncMode: boolean = false; // define the mode : async or not (see next line)
	private readonly processFunc: Function = null; // async (process) or synchronous (syncProcess) depending on the mode
	private streamContent: string = ''; // content of the stream (concatenated @chunk)
	private jsonContent: {}[] = []; // all the whole JSONs found in streamContent
	private goReading: boolean = false; // indicate when the read function can be used
	private readonly nextInput: boolean = false; // false when the input is not complete // usefull ?
	private slotArray: any[] = []; // array of streams, each corresponding to an input (piped on this Task)
	private jobsRun: number = 0; // number of jobs that are still running
	private jobsErr: number = 0; // number of jobs that have emitted an error
	protected rootdir: string = __dirname;
	protected readonly staticInputs: any = null; // to keep a probe PDB for example, given by the options into the constructor
	protected coreScript: string = null; // path of the core script of the Task
	protected readonly modules: string[] = []; // modules needed in the coreScript to run the Task
	protected readonly exportVar: {} = {}; // variables to export, needed in the coreScript of the Task
	protected settFile: string = null; // file path of the proper settings of the Task
	protected settings: {} = {}; // content of the settFile or other settings if the set() method is used
	protected automaticClosure: boolean = false; // TODO (not implemented yet)
	protected staticTag: string = null; // tagTask : must be unique between all the Tasks

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Initialize the task parameters with values gived by user.
	* Two managements are possible : with a jobManager (1) or without (2).
	*/
	protected constructor (management: any, syncMode: boolean, options?: any) {
		super(options);
		if (typeof management == "undefined") throw 'ERROR : a literal for job management must be specified';
		if (typeof syncMode == "undefined") throw 'ERROR : a mode must be specified (sync = true // async = false)';

		if (management.hasOwnProperty('jobManager')) { // (1)
			this.jobManager = management.jobManager;
			if (management.hasOwnProperty('jobProfile')) {
				this.jobProfile = management.jobProfile;
			} else {
				console.log('NEWS : no jobProfile specified -> take default jobProfile for the ' + this.staticTag + ' task.');
			}
		} else if (management.hasOwnProperty('emulate')) { // (2)
			if (! management.emulate.hasOwnProperty('cacheDir')) throw 'ERROR : no cacheDir specified in the jobManagement literal';
			if (! management.emulate.hasOwnProperty('tcp')) throw 'ERROR : no tcp specified in the jobManagement literal';
			if (! management.emulate.hasOwnProperty('port')) throw 'ERROR : no port specified in the jobManagement literal';
			let task_uuid = uuid();
			this.emulOptions = JSON.parse(JSON.stringify(management.emulate)); // deep-copy
			this.emulOptions.cacheDir = this.emulOptions.cacheDir + '/' + task_uuid + '/';
			this.mkdir(this.emulOptions.cacheDir);
			this.runFunc = this.emulate;
			console.log('NEWS : you have selected the emulate mode for the ' + this.staticTag + ' task.');
		}
		
		// syncMode
		this.syncMode = syncMode;
		if (this.syncMode === true) this.processFunc = this.syncProcess;
		else this.processFunc = this.process;
		// options
		if (typeof options !== 'undefined') {
			if (options.hasOwnProperty('staticInputs')) {
            	this.staticInputs = options.staticInputs;
            }
            if (options.hasOwnProperty('modules')) {
            	this.modules = options.modules;
            }
            if (options.hasOwnProperty('exportVar')) {
            	this.exportVar = options.exportVar;
            }
        }
	}

	/*
	* DO NOT MODIFY
	* To (in)activate the test mode : (in)activate all the console.log/dir
	*/
	public testMode (bool: boolean): void {
		this.b_test = bool;
		if (this.b_test) console.log('NEWS : Task test mode is activated for task ' + this.staticTag);
		else console.log('NEWS : Task test mode is off for task ' + this.staticTag);
	}

	/*
	* DO NOT MODIFY
	* Initialization of the task : called ONLY by the constructor.
	* @data is either a string which describe a path to a JSON file,
	* or a literal like { 'author' : 'me', 'settings' : { 't' : 5, 'iterations' : 10 } }.
	*/
	protected init (data: any): void {
		if (data) {
			let userData;
			if (typeof data === "string") userData = this.parseJsonFile(data);
			else userData = data;
			if ('coreScript' in userData) this.coreScript = this.rootdir+ '/' + userData.coreScript;
			if ('automaticClosure' in userData) this.automaticClosure = userData.automaticClosure;
			if ('settings' in userData) this.settings = userData.settings;
		}
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Change task parameters according to @data :
	* @data is either a string which describe a path to a JSON file,
	* or a literal like { 'author' : 'me', 'settings' : { 't' : 5, 'iterations' : 10 } }.
	*/
	protected set (data: any): void {
		if (data) {
			let userData;
			if (typeof data === "string") userData = this.parseJsonFile(data);
			else userData = data;
			if ('coreScript' in userData) this.coreScript = this.rootdir + '/' + userData.coreScript;
			if ('automaticClosure' in userData) this.automaticClosure = userData.automaticClosure;
			if ('settings' in userData) {
				for (var key in userData.settings) {
					if (this.settings.hasOwnProperty(key)) this.settings[key] = userData.settings[key];
					else throw 'ERROR : cannot set the '+ key +' property which does not exist in this task';
				}
			}
		}
	}

	/*
	* DO NOT MODIFY
	* In anticipation of the unique jobManager processus and its monitor mode.ew
	*/
	public getState (): {} {
		return {
			"staticTag" : <string> this.staticTag,
			"syncMode" : <boolean> this.syncMode,
			"jobProfile" : <string> this.jobProfile,
			"stillRunning" : <number> this.jobsRun,
			"errorEmitted" : <number> this.jobsErr
		}
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* NOT USED FOR NOW
	* According to the parameter this.automaticClosure,
	* close definitely this task or just push the string "null"
	*/
	protected pushClosing (): void {
		if (this.automaticClosure) this.push(null);
		else this.push('null');
	}

	/*
	* DO NOT MODIFY
	* Pre-processing of the job.
	* Configure the dictionary to pass to the jobManager.push() function, according to :
	* 	(1) the list of the modules needed
	* 	(2) variables to export in the coreScript
	*	(3) the inputs : stream or string or path in an array of JSONs
	*/
	protected configJob (inputs: {}[]): Object {
		let self = this;
	    var jobOpt: {} = {
	    	'tagTask' : <string> self.staticTag,
	    	'script' : <string> self.coreScript,
	        'modules' : <[string]> self.modules, // (1)
	        'exportVar' : <{}> self.exportVar, // (2)
	        'inputs' : <{}> self.concatJson(inputs) // (3)
	    };
	    return jobOpt;
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Here manage the input(s)
	*/
	protected prepareJob (inputs: any[]): any {
		return this.configJob(inputs);
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* To manage the output(s)
	*/
	protected prepareResults (chunk: string): any {
		var chunkJson = this.parseJson(chunk);
		var results: {} = {
			'out' : chunkJson
		};
    	return results;
	}

	/*
	* DO NOT MODIFY
	* Parse @stringT [string] to find all JSON objects into.
	* Method : look at every character in the string to find the start & the end of JSONs,
	* and then substring according to start & end indices. The substrings are finally converted into JSONs.
	* Returns in @results [literal] a list of JSON objects [@results.jsonTab] and @stringT without all JSON substrings [@results.rest].
	* for tests = zede}trgt{"toto" : { "yoyo" : 3}, "input" : "tototo\ntititi\ntatata"} rfr{}ojfr
	*/
	private findJson (stringT: string): any {
	var toParse: string = stringT; // copy of string
	var open: string = '{', close: string = '}';
	var jsonStart: number = -1, jsonEnd: number = -1;
	var counter: number = 0;
	var sub_toParse: string;
	var result: any = {
		"rest" : "",
		"jsonTab" : []
	};
		/*
		* Check the existence of JSON extremities in @toParse [string].
		* Method :
		* (1) search the indice of the first { in the string
		* (2) search a } from the indice to the end of the string
		*/
		var detectExtremities = function (toParse: string): boolean { 
			var open: string = '{', close: string = '}';
			var first_open: number = toParse.search(open); // (1)
			if (first_open === -1) return false;
			var next_close: number = toParse.substring(first_open).search(close); // (2)
			if (next_close === -1) return false;
			else return true;
		}

		while (detectExtremities(toParse)) {
			counter = 0, jsonStart = -1, jsonEnd = -1;
			for (let i = 0; i < toParse.length; i++) { // for each character in @toParse
				if (toParse[i].match(open)) {
					if (counter === 0) jsonStart = i; // if a JSON is beginning
					counter ++;
				}
				
				if (toParse[i].match(close) && jsonStart !== -1) { // looking for a } only if a { was found before
					counter --;
					if (counter === 0) { // end of the JSON
						jsonEnd = i;
						// prepare the JSON object
						sub_toParse = toParse.substring(jsonStart, jsonEnd + 1);
						var myJson = this.parseJson(sub_toParse);
						if (myJson === null) throw "WARNING : make sure your data contains well writing \"\\n\" !";
						result.jsonTab.push(myJson);

						toParse = toParse.replace(sub_toParse, ''); // remove the part of the JSON already parsed
						break;
					}
				}
			}
			if (jsonEnd === -1) toParse = toParse.substring(jsonStart+1) // continue the research without all before the first {
		}
		result.rest += toParse;
		return result;
	}


	/*
	* DO NOT MODIFY
	* Synchronous process method.
	* Use @chunk from @aStream to search for one JSON (at least), and then call the run method.
	*/
	private syncProcess (chunk: any, aStream: any): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this; // self = this = TaskObject =//= aStream = a slot of self
		self.feed_streamContent(chunk, aStream);

		var numOfRun: number = -1;
		for (let i in self.slotArray) {
			var slot_i = self.slotArray[i];
			if (self.b_test) {
				console.log("i : " + i);
				console.log("slotArray[i] : " + slot_i);
			}
			self.feed_jsonContent(slot_i);
			// take the length of the smallest jsonContent :
			if (numOfRun === -1) numOfRun = slot_i.jsonContent.length;
			if (slot_i.jsonContent.length < numOfRun) numOfRun = slot_i.jsonContent.length;
		}
		if (self.b_test) console.log("numOfRun : " + numOfRun);

		for (let j = 0; j < numOfRun; j ++) { // not more than the length of the smallest jsonContent
			if (self.b_test) {
				console.log("%%%%%%%%%%%%% here synchronous process");
				console.log("j : " + j);
			}
			var inputsTab = [];
			for (let k in self.slotArray) { // take the first JSON of each slot
				inputsTab.push(self.slotArray[k].jsonContent[j]);
			}
			// for tests
			//inputsTab = [ { "inputFile": '{\n"myData line 1" : "titi"\n}\n' }, { "inputFile2": '{\n"myData line 1" : "tata"\n}\n' } ]
			// end of tests
			if (self.b_test) console.log(inputsTab);
			self.runFunc(inputsTab)
			.on('treated', results => {
				self.applyOnArray(self.shift_jsonContent, self.slotArray);
				emitter.emit('processed');
			})
			.on('error', (err) => {
				emitter.emit('error');
			})
			.on('stderrContent', buf => {
				emitter.emit('stderrContent', buf);
			})
			.on('lostJob', (msg, jid) => {
	        	emitter.emit('lostJob', msg, jid);
	        });
		}
		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Fill the streamContent of @aStream or @this with @chunk
	*/
	private feed_streamContent (chunk: any, aStream?: any): void {
		if (typeof chunk == "undefined") throw 'ERROR : Chunk is ' + chunk;
		if (Buffer.isBuffer(chunk)) chunk = chunk.toString(); // chunk can be either string or buffer but we need a string

		var self = this;
		var streamUsed = typeof aStream != "undefined" ? aStream : self;

		streamUsed.streamContent += chunk;
		if (self.b_test) {
			console.log('streamContent :');
			console.log(streamUsed.streamContent);
		}
	}

	/*
	* DO NOT MODIFY
	* Fill the jsonContent of @aStream or @this thanks to the findJson method.
	*/
	private feed_jsonContent (aStream?: any): void {
		var self = this;
		var streamUsed = typeof aStream != "undefined" ? aStream : self;

		var results = this.findJson(streamUsed.streamContent); // search for JSON
		if (self.b_test) console.log(results);
		if (results.jsonTab.length < 1) return; // if there is no JSON at all, bye bye
		streamUsed.jsonContent = streamUsed.jsonContent.concat(results.jsonTab); // take all the JSON detected ...
		streamUsed.streamContent = results.rest; // ... and keep the rest into streamContent
		
		if (self.b_test) {
			console.log('jsonContent :');
			console.dir(streamUsed.jsonContent);
		}
	}

	/*
	* DO NOT MODIFY
	* (1) check if the @jsonValue is null to close the stream : not implemented = see TODO
	* (2) prepare the job = by setting options & creating files for the task
	* (3) run
	* (4) receive all the data
	* (5) at the end of the reception, prepare the results & send
	*/
	private run (jsonValue: {}[]): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this;
		var job_uuid: string = null; // in case a uuid is passed
		// if (jsonValue === 'null' || jsonValue === 'null\n') { // (1)
		// 	self.pushClosing();
		// } else {
			var jobOpt: any = self.prepareJob(jsonValue); // (2) // jsonValue = array of JSONs
			if (jobOpt.inputs.hasOwnProperty('uuid')) {
				job_uuid = jobOpt.inputs.uuid;
				delete jobOpt.inputs['uuid'];
			}
			if (self.b_test) {
				console.log("jobOpt :")
				console.log(jobOpt);
			}
			var j = self.jobManager.push(self.jobProfile, jobOpt, job_uuid); // (3)
			j.on('completed', (stdout, stderr, jobObject) => {
				if (stderr) {
	                stderr.on('data', buf => {
	                	if (self.b_test) {
	                    	console.error('stderr content : ');
	                    	console.error(buf.toString());
	                    }
	                    emitter.emit('stderrContent', buf);
	                });
	            }
	            var chunk: string = '';
	            stdout.on('data', buf => { chunk += buf.toString(); }); // (4)
	            stdout.on('end', () => {
	            	self.async(function () {
	            		var res = self.prepareResults(chunk);
	            		if (job_uuid !== null) res['uuid'] = job_uuid;
	            		return res;
	            	}).on('end', results => { // (5)
	            		self.goReading = true;
	            		self.push(JSON.stringify(results)); // pushing string = activate the "_read" method
	            		emitter.emit('treated', results);
	            	});
	            });
	        });
	        j.on('jobError', (stdout, stderr, j) => {
	            console.log('job ' + j.id + ' : ' + stderr);
	            emitter.emit('error', stderr, j.id);
	        });
	        j.on('lostJob', (msg, j) => {
	        	console.log('job ' + j.id + ' : ' + msg);
	        	emitter.emit('lostJob', msg, j.id);
	        });
		// }
		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Similar to the this.run function but without any jobManager
	*/
	private emulate (jsonValue: {}[]): events.EventEmitter {
		console.log("hello world");
		let emitter = new events.EventEmitter();
		let self = this;
		let job_uuid: string = null; // in case a uuid is passed
		let arg_array: string[] = [];
		
		let jobOpt: any = self.prepareJob(jsonValue);
		console.log(jobOpt)
		if (jobOpt.inputs.hasOwnProperty('uuid')) {
			job_uuid = jobOpt.inputs.uuid;
			delete jobOpt.inputs['uuid'];
		}
		let coreScriptJob: string = self.prepFiles(jobOpt);
		arg_array.push(coreScriptJob);

		console.log('bash');
		console.log(arg_array);

		let myProcess = childPro.spawn('bash', arg_array);
		myProcess.stdout.on('data', (d) => {
			console.log('data : ')
			console.log(d.toString())
		});
		myProcess.stderr.on('data', (d) => {
			console.log('err : ')
			console.log(d.toString())
		});
		myProcess.on('close', (code) => {
			// do something
			console.log('toto & code is : ' + code);
		});

		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Used with the emulate method. 
	* Directory and file creations. Bash script creation.
	*/
	private prepFiles (jobOpt: any): string {
		let self = this;
		let jobID: string = uuid();
		let str_bash: string = '#!/bin/bash\n';

		// directory creations
		let workDir: string = self.emulOptions.cacheDir + '/' + jobID + '/';
		self.mkdir(workDir);
		let inputDir = workDir + '/input/';
		self.mkdir(inputDir);

		// bash creation
		str_bash += 'echo "JOB_STATUS ' + jobID + ' START"  | nc -w 2 ' + self.emulOptions.tcp + ' ' + self.emulOptions.port + " > /dev/null\n";
		if (jobOpt.hasOwnProperty('exportVar')) {
	        for (let key in jobOpt.exportVar) {
	            str_bash += key + '="' + jobOpt.exportVar[key] + '"\n';
	        }
	    }
	    if (jobOpt.hasOwnProperty('inputs')) {
	        for (let key in jobOpt.inputs) {
	        	let inputFile: string = workDir + '/input/' + key + '.inp';
	        	self.writeFile(inputFile, jobOpt.inputs[key]);
	            str_bash += key + '="' + inputFile + '"\n';
	        }
	    }
	    if (jobOpt.hasOwnProperty('modules')) {
	        for (let key in jobOpt.modules) {
	            str_bash += "module load " + jobOpt.modules[key] + '\n';
	        }
	    }

	    let coreScriptJob: string = workDir + '/' + jobID + '_coreScript.sh';
	    self.copyFile(self.coreScript, coreScriptJob);
		str_bash += '. ' + coreScriptJob + '\n';
		str_bash += 'echo "JOB_STATUS ' + jobID + ' FINISHED"  | nc -w 2 ' + self.emulOptions.tcp + ' ' + self.emulOptions.port + " > /dev/null\n";
		
		let bashScript: string = workDir + '/' + jobID + '.sh';
		self.writeFile(bashScript, str_bash);

		return bashScript;
		// or
		// self.writeFile(bashPath, str_bash);
		// return path_bash;
	}

	/*
	* DO NOT MODIFY
	* (1) use @aStream (first choice) or @this (second choice)
	* (2) consume @chunk
	* (3) look at every JSON object we found into the @jsonContent of @streamUsed
	* (4) treat it
	* (5) remove the jsonContent
	*/
	private process (chunk: any, aStream?: any): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this;
		var streamUsed = typeof aStream != "undefined" ? aStream : self; // (1)
		this.feed_streamContent(chunk, streamUsed); // (2)
		this.feed_jsonContent(streamUsed); // (2)
		
		streamUsed.jsonContent.forEach((jsonVal, i, array) => { // (3)
			if (self.b_test) console.log("%%%%%%%%%%%% hello i am processing asynchronous");
			if (self.syncMode === true) {
				console.log("WARNING : ASYNC process method is running for an object configured in SYNC mode");
				console.log("WARNING : (due to the used of write or pipe method)");
				//console.log(this);
			}
			if (self.b_test) console.log('######> i = ' + i + '<#>' + jsonValue + '<######');
			var jsonValue = [jsonVal]; // to adapt to syncProcess modifications
			self.runFunc(jsonValue) // (4)
			.on('treated', (results) => {
				self.shift_jsonContent(streamUsed); // (5)
				emitter.emit('processed', results);
			})
			.on('error', (err, jobID) => {
				emitter.emit('error', err, jobID);
			})
			.on('stderrContent', (buf) => {
				emitter.emit('stderrContent', buf);
			})
			.on('lostJob', (msg, jid) => {
	        	emitter.emit('lostJob', msg, jid);
	        });
		});
		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Necessary to use anotherTask.pipe(task)
	*/
	public _write (chunk: any, encoding?: string, callback?: any): Task {
		var self = this;
		if (self.b_test) console.log(self.staticTag + ' >>>>> write');

		self.process(chunk) // obligatory asynchronous when using a anotherTask.pipe(this)
		.on('processed', results => {
			self.emit('processed', results);
		})
		.on('error', (err, jobID) => {
			self.emit('err', err, jobID);
		})
		.on('stderrContent', buf => {
			self.emit('stderrContent', buf);
		})
		.on('lostJob', (msg, jid) => {
	        self.emit('lostJob', msg, jid);
	    });
		callback();
		return self;
	}


	/*
	* DO NOT MODIFY
	* Necessary to use task.pipe(anotherTask)
	*/
	public _read (size?: number): any {
		if (this.b_test) console.log('>>>>> read');
		if (this.goReading) {
			if (this.b_test) console.log('>>>>> read: this.goReading is F');
            this.goReading = false;
        }
	}

	/*
	* DO NOT MODIFY
	* Add a slot to the Task on which is realized the superPipe (@s).
	* So @s must be an instance of TaskObject !
	*/
	public superPipe (s: Task): Task {
		if (s instanceof Task) {
			s.addSlot(this);
		} else {
			throw "ERROR : Wrong use of superPipe method. In a.superPipe(b), b should be an instance of TaskObject";
		}
		return s;
	}

	/*
	* DO NOT MODIFY
	* Slot = a new duplex to receive one type of data
	*/
	private addSlot (previousTask: Task): void {
		class slot extends stream.Duplex { // a slot is a Duplex
		    goReading: boolean;
		    streamContent: string;
		    jsonContent: {}[]; // array of JSONs
			constructor (options?: any) {
		    	super(options);
		    	this.goReading = false;
		    	this.streamContent = '';
		    	this.jsonContent = [];
		    }
		    _write (chunk: any, encoding?: string, callback?: any): void {
		    	if (self.b_test) {
			    	console.log("processFunc = ");
			    	console.log(self.processFunc);
			    }
		    	self.processFunc(chunk, this)
		    	.on('processed', s => {
					self.emit('processed', s);
				})
				.on('error', s => {
					self.emit('err', s);
				})
				.on('stderrContent', buf => {
					self.emit('stderrContent', buf);
				})
				.on('lostJob', (msg, jid) => {
	        		self.emit('lostJob', msg, jid);
	    		});
		    	callback();
		    }
			_read (size?: number): void {} // we never use this method but we have to implement it
		}
		var self = this;
		var stream_tmp = new slot();
		self.slotArray.push(stream_tmp);
		previousTask.pipe(stream_tmp);
	}

	/*
	* Try to kill the job(s) of this task
	* WARNING : not implemented : 
	jobManager.stop exposes 4 events:
        'cleanExit' : all jobs were succesfully killed
        'leftExit'  : some jobs could not be killed
        'emptyExit' : no jobs  to kill
        'cancelError' : an error occur while killing
        'listError': an error occur  while listing processes corresponding to pending jobs
	*/
	public kill (managerSettings): events.EventEmitter {
		console.log('ERROR : The kill method is not implemented yet');
		var emitter = new events.EventEmitter();
	    this.jobManager.stop(managerSettings, this.staticTag)
	    .on('cleanExit', function (){
	        emitter.emit('cleanExit');
	    })
	    .on('exit', function (){
	        emitter.emit('exit');
	    })
	    .on('errScancel', function () {
	        emitter.emit('errScancel');
	    })
	    .on('errSqueue', function () {
	        emitter.emit('errSqueue');
	    });

	    if (this.b_test) console.log(emitter);
	    return emitter;
	}

	/*
	* DO NOT MODIFY
	* WARNING : the argument of @myFunc used with @myData must be the first argument given to @myFunc.
	* (1) extract all the arguments (except @myFunc and @myData) to put them into an array = @args
	* (2) check if @myData is an array (true) or not (false) :
	* 	- (3) if TRUE : apply @myFunc on each element of @myData + all the array @args.
	* 	- (4) if FALSE : apply @myFunc on @myData and the @args.
	*/
	protected applyOnArray (myFunc: Function, myData: any): any {
		var self = this;
		var args = Array.prototype.slice.call(arguments, 2); // (1)
		if (Array.isArray(myData)) { // (2)
			var results = [];
			for (let i in myData) { // (3)
				args.unshift(myData[i]);
				results.push(myFunc.apply(self, args));
			}
			return results;
		} else { // (4)
			args = args.unshift(myData);
			return myFunc.apply(self, args);
		}
	}

	/*
	* DO NOT MODIFY
	* Concatenate JSONs that are in the same array
	*/
	private concatJson (jsonTab: {}[]): {} {
		var newJson: {} = {};
		for (let i = 0; i < jsonTab.length; i ++) {
	    	for (let key in jsonTab[i]) {
	    		if (newJson.hasOwnProperty(key)) throw 'ERROR with jsonTab in concatJson() : 2 JSON have the same key';
	    		newJson[key] = jsonTab[i][key];
	    	}
	    }
	    if (this.b_test) {
		    console.log("newjson :");
		    console.log(newJson);
		}
	    return newJson;
	}

	/*
	* DO NOT MODIFY
	* Remove the first element of the jsonContent of @aStream used for the computation.
	*/
	private shift_jsonContent (aStream: any): void {
		aStream.jsonContent.shift();
	}

	/*
	* DO NOT MODIFY
	* Open a json file and return its content if no error otherwise return null
	*/
	public parseJsonFile (file: string): {} {
		try {
			var dict: {} = jsonfile.readFileSync(file, 'utf8');
			return dict;
		} catch (err) {
			console.log('ERROR in parseJsonFile() :\n' + err);
			return null;
		}
	}

	/*
	* DO NOT MODIFY
	* Parse @data to check if it is in JSON format.
	*/
	public parseJson (data: {}): {} {
		try { return JSON.parse(data) }
		catch (err) {
			console.log('ERROR in parseJson() :\n' + err);
			return null;
		}
	}

	/*
	* DO NOT MODIFY
	* Try to write the @file with the @fileContent.
	*/
	public writeFile (file: string, fileContent: string): void {
		try {
			fs.writeFileSync(file, fileContent);
		} catch (err) {
			console.log('ERROR while writing the file ' + file + ' :\n' + err);
		}
	}

	/*
	* DO NOT MODIFY
	* Try to create the @dir.
	*/
	public mkdir (dir: string): void {
		try {
			fs.mkdirSync(dir);
		} catch (err) {
			console.log('ERROR while creating the directory ' + dir + ' :\n' + err);
		}
	}

	/*
	* DO NOT MODIFY
	* Try to copy the file @src to the path @dest.
	*/
	public copyFile (src: string, dest: string): void {
		let rs = fs.createReadStream(src);
		let ws = fs.createWriteStream(dest);
		rs.pipe(ws);
		rs.on("error", (err) => { console.log('ERROR in copyFile while reading the file ' + src + ' :\n' + err); });
		ws.on("error", function(err) { console.log('ERROR in copyFile while writing the file ' + dest + ' :\n' + err);});
	}

	/*
	* DO NOT MODIFY
	* Make a @callback asynchronous
	*/
	protected async (callback: any): events.EventEmitter {
		var result = callback();
		var emitter = new events.EventEmitter;
		setTimeout(() => { emitter.emit('end', result); }, 10);
		return emitter;
	}
}

