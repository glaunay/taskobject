/*
* CLASS TASK
* settFile must be like :
{
	"coreScript": "./data/simple.sh",
	"settings": {}
}


* Usage :
var tk = require('taskobject');
var management = {
	"jobManager" : jobManager, // JM is "nslurm" repo
	"jobProfile" : jobProfile // see with JM spec.
}
var syncMode = true; // define the usage of your taskTest
var taskTest = new tk.Task (management, syncMode);
readableStream.pipe(taskTest).pipe(writableStream);


* Inheritance :
A child class of Task must not override methods with a "DO NOT MODIFY" indication


*/

/**** TODO ****
- doc
- kill() method (not necessary thanks to the new jobManager with its "engines")
- init() method : arguments nommés (soit un JSON soit un string)
*/

import childPro = require('child_process');
import events = require ('events');
import fs = require ('fs');
import JSON = require ('JSON');
import jsonfile = require ('jsonfile');
import stream = require ('stream');
import util = require('util');
import uuid = require('uuid/v4');

import { logger } from './lib/logger';
import { loggerLevels } from './lib/logger';

declare var __dirname;

export abstract class Task extends stream.Readable {
	private readonly jobManager: any = null; // job manager (engineLayer version)
	private readonly jobProfile: string = null; // "arwen_express" for example (see the different config into nslurm module)
	private readonly syncMode: boolean = false; // define the mode : async or not (see next line)
	private streamContent: string = ''; // content of the stream (concatenated @chunk)
	private jsonContent: {}[] = []; // all the whole JSONs found in streamContent
	private goReading: boolean = false; // indicate when the read function can be used
	protected slotSymbols: string[] = []; // all the slot symbols this task needs
	private jobsRun: number = 0; // number of jobs that are still running
	private jobsErr: number = 0; // number of jobs that have emitted an error
	protected rootdir: string = __dirname; // current directory of @this
	protected coreScript: string = null; // path of the core script of the Task
	protected readonly modules: string[] = []; // modules needed in the coreScript to run the Task
	protected readonly exportVar: {} = {}; // variables to export, needed in the coreScript of the Task
	protected settFile: string = null; // file path of the proper settings of the Task
	protected settings: {} = {}; // content of the settFile or other settings if the set() method is used
	protected staticTag: string = null; // tagTask : must be unique between all the Tasks

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Initialize the task parameters with values gived by user.
	*/
	protected constructor (management: any, options?: any) {
		super(options);
		if (typeof management == "undefined") throw 'ERROR : a literal for job management must be specified';

		if (management.hasOwnProperty('jobManager')) {
			this.jobManager = management.jobManager;
			if (management.hasOwnProperty('jobProfile')) {
				this.jobProfile = management.jobProfile;
			} else {
				logger.log('INFO', 'no jobProfile specified -> take default jobProfile for the ' + this.staticTag + ' task.');
			}
		} else {
			throw 'ERROR : no \'jobManager\' key specified in the job management literal.';
		}

		// options
		if (typeof options !== 'undefined') {
			if (options.hasOwnProperty('logLevel')) {
				let upperLevel = options.logLevel.toUpperCase();
				if (loggerLevels.hasOwnProperty(upperLevel)) logger.level = upperLevel;
				else logger.log('WARNING', 'the ' + upperLevel + ' level of log does not exist -> taking the default level : ' + logger.level);
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
			if ('settings' in userData) this.settings = userData.settings;
		}
		// creation of the slots
		if (this.slotSymbols.length == 0) throw 'ERROR : your task must define at least one slot symbol';
		else {
			for (let sym of this.slotSymbols) {
				this[sym] = this.createSlot(sym);
			}
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
	* In anticipation of the unique jobManager processus and its monitor mode.
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
	* Find all the slots in @this and return them into an array (map method).
	*/
	protected getSlots (): any[] {
		return this.slotSymbols.map((sym, i, arr) => {
			return this[sym];
		});
	}

	/*
	* DO NOT MODIFY
	* Process method.
	* Use @chunk from @aStream to search for one JSON (at least), and then call the run method.
	*/
	private process (chunk: any, aStream: any): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this; // self = this = TaskObject =//= aStream = a slot of self
		var slotArray: any[] = this.getSlots();
		self.feed_streamContent(chunk, aStream);

		var numOfRun: number = -1; // the length of the smallest jsonContent among all the slots's jsonContents

		for (let slt of slotArray) { // for each slot
			logger.log('DEBUG', 'slotArray[i] : \n' + util.format(slt));
			self.feed_jsonContent(slt);
			// take the length of the smallest jsonContent :
			if (numOfRun === -1) numOfRun = slt.jsonContent.length;
			if (slt.jsonContent.length < numOfRun) numOfRun = slt.jsonContent.length;
		}
		logger.log('DEBUG', 'numOfRun = ' + numOfRun);

		for (let j = 0; j < numOfRun; j ++) { // no more than the length of the smallest jsonContent
			logger.log('INFO', '***** synchronous process');
			logger.log('DEBUG', 'j = ' + j);

			var inputArray = slotArray.map((slt) => slt.jsonContent[j] );

			// for tests
			//inputArray = [ { "input": '{\n"myData line 1" : "titi"\n}\n' }, { "input2": '{\n"myData line 1" : "tata"\n}\n' } ]
			// end of tests
			logger.log('DEBUG', 'inputArray = \n' + util.format(inputArray));

			self.run(inputArray)
			.on('treated', results => {
				// remove the first element in the jsonContent of every slots :
				self.applyOnArray(self.shift_jsonContent, slotArray);
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
		logger.log('DBEUG', 'streamContent : ' + streamUsed.streamContent);
	}

	/*
	* DO NOT MODIFY
	* Fill the jsonContent of @aStream or @this thanks to the findJson method.
	*/
	private feed_jsonContent (aStream?: any): void {
		var self = this;
		var streamUsed = typeof aStream != "undefined" ? aStream : self;

		var results = this.findJson(streamUsed.streamContent); // search for JSON
		logger.log('DEBUG', 'results = \n' + util.format(results));

		if (results.jsonTab.length < 1) return; // if there is no JSON at all, bye bye
		streamUsed.jsonContent = streamUsed.jsonContent.concat(results.jsonTab); // take all the JSON detected ...
		streamUsed.streamContent = results.rest; // ... and keep the rest into streamContent
		
		logger.log('DEBUG', 'jsonContent of ' + streamUsed.symbol + ' = \n' + util.format(streamUsed.jsonContent));
	}

	/*
	* DO NOT MODIFY
	* (1) prepare the job = by setting options & creating files for the task
	* (2) run
	* (3) receive all the data
	* (4) at the end of the reception, prepare the results & send
	*/
	private run (jsonValue: {}[]): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this;
		var job_uuid: string = null; // in case a uuid is passed

		var jobOpt: any = self.prepareJob(jsonValue); // (1) // jsonValue = array of JSONs
		if (jobOpt.inputs.hasOwnProperty('uuid')) {
			job_uuid = jobOpt.inputs.uuid;
			delete jobOpt.inputs['uuid'];
		}
		logger.log('DEBUG', 'jobOpt = ' + JSON.stringify(jobOpt));

		var j = self.jobManager.push(self.jobProfile, jobOpt, job_uuid); // (2)
		j.on('completed', (stdout, stderr, jobObject) => {
			if (stderr) {
                stderr.on('data', buf => {
                	logger.log('ERROR', 'stderr content = \n' + buf.toString())
                    emitter.emit('stderrContent', buf);
                });
            }
            var chunk: string = '';
            stdout.on('data', buf => { chunk += buf.toString(); }); // (3)
            stdout.on('end', () => {
            	self.async(function () {
            		var res = self.prepareResults(chunk);
            		if (job_uuid !== null) res['uuid'] = job_uuid;
            		return res;
            	}).on('end', results => { // (4)
            		self.goReading = true;
            		self.push(JSON.stringify(results)); // pushing string = activate the "_read" method
            		emitter.emit('treated', results);
            	});
            });
        });
        j.on('jobError', (stdout, stderr, j) => {
        	logger.log('ERROR', 'job ' + j.id + ' : ' + stderr);
            emitter.emit('error', stderr, j.id);
        });
        j.on('lostJob', (msg, j) => {
        	logger.log('ERROR', 'job ' + j.id + ' : ' + msg);
        	emitter.emit('lostJob', msg, j.id);
        });
		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Necessary to use task.pipe(anotherTask)
	*/
	public _read (size?: number): any {
		logger.log('DEBUG', '>>>>> read from ' + this.staticTag);
		if (this.goReading) {
			logger.log('DEBUG', '>>>>> read: this.goReading is F from ' + this.staticTag);
            this.goReading = false;
        }
	}

	/*
	* DO NOT MODIFY
	* Slot = a new writable stream to receive one type of data (= one input)
	*/
	private createSlot (symbol: string): stream.Writable {
		var self = this;

		class slot extends stream.Writable { // a slot is a Duplex
			symbol: string; // key of the input = id of the input
		    goReading: boolean = false;
		    streamContent: string = '';
		    jsonContent: {}[] = []; // array of JSONs
			constructor (symbol: string, options?: any) {
		    	super(options);
		    	if (typeof symbol == 'undefined') throw 'ERROR : a symbol must be specified !';
		    	this.symbol = symbol;
		    }
		    _write (chunk: any, encoding?: string, callback?: any): void {
		    	self.process(chunk, this)
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
		}

		return new slot(symbol);
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
		logger.log('ERROR', 'The kill method is not implemented yet');
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
		logger.log('DEBUG', 'json array to concatenate = \n' + util.format(jsonTab));

		for (let i = 0; i < jsonTab.length; i ++) {
	    	for (let key in jsonTab[i]) {
	    		if (newJson.hasOwnProperty(key)) throw 'ERROR with jsonTab in concatJson() : 2 JSON have the same key';
	    		newJson[key] = jsonTab[i][key];
	    	}
	    }
	    logger.log('DEBUG', 'newJson = \n' + util.format(newJson));
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
			logger.log('ERROR', 'in parseJsonFile() :\n' + err);
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
			logger.log('ERROR', 'in parseJson() :\n' + err);
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
			logger.log('ERROR', 'while writing the file ' + file + ' :\n' + err);
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
			logger.log('ERROR', 'while creating the directory ' + dir + ' :\n' + err);
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
		rs.on("error", (err) => { logger.log('ERROR', 'in copyFile while reading the file ' + src + ' :\n' + err); });
		ws.on("error", function(err) { logger.log('ERROR', 'in copyFile while writing the file ' + dest + ' :\n' + err);});
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

