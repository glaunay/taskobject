/*
***** CLASS TASK *****

* Usage :


* Inheritance :
A child class of Task must not override methods with a "DO NOT MODIFY" indication


*/

/**** TODO ****
- doc
- mettre en place un commander et une fonction usage pour ce script au cas où
- verbose level option in ./test/test.ts

*/

import childPro = require('child_process');
import events = require('events');
import fs = require('fs');
import JSON = require('JSON');
import jsonfile = require('jsonfile');
import stream = require('stream');
import util = require('util');
import uuid = require('uuid/v4');
import utils = require('util');
import logger = require('winston');
//import { loggerLevels } from './lib/logger';

import typ = require('./types/index');

declare var __dirname;

export abstract class Task extends stream.Readable {
	private readonly jobManager: any = null; // job manager (engineLayer version)
	private readonly jobProfile: string = null; // "arwen_express" for example (see the different config into nslurm module)
	private streamContent: string = ''; // content of the stream (concatenated @chunk)
	private jsonContent: typ.stringMap[] = []; // all the whole JSONs found in streamContent
	private goReading: boolean = false; // indicate when the read function can be used
	protected slotSymbols: string[] = []; // all the slot symbols this task needs
	protected rootdir: string = __dirname; // current directory of @this
	protected coreScript: string = null; // path of the core script of the Task
	protected readonly modules: string[] = []; // modules needed in the coreScript to run the Task
	protected readonly exportVar: typ.stringMap = {}; // variables to export, needed in the coreScript of the Task
	protected readonly staticTag: string = this.constructor.name; // tagTask : the name of the class
	protected outKey: string = 'out'; // key used for the outgoing JSON (with the results)
//	private logLevel:string;
	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Initialize the task parameters with values gived by user.
	*/
	protected constructor (management: typ.management, options?: any) {
		super(options);
		if (typeof management == "undefined") throw 'ERROR : a literal for job management must be specified';
		if (! typ.isManagement(management)) throw 'ERROR : wrong format of @management !';

		this.jobManager = management.jobManager;
		if (management.hasOwnProperty('jobProfile')) {
			this.jobProfile = management.jobProfile;
		} else {
			logger.warn(`no jobProfile specified -> take default jobProfile for the ${this.staticTag} task`);
		}

		// options
		if (typeof options !== 'undefined') {
			if (options.hasOwnProperty('logLevel')) {
			/*
				let upperLevel = options.logLevel.toUpperCase();			
				if (loggerLevels.hasOwnProperty(upperLevel)) logger.level = upperLevel;
				else logger.log('WARNING', 'the ' + upperLevel + ' level of log does not exist -> taking the default level : ' + logger.level);
				this.logLevel = upperLevel;
			*/

            }
            if (options.hasOwnProperty('modules')) {
            	this.modules = options.modules;
            }
            if (options.hasOwnProperty('exportVar')) {
            	this.exportVar = options.exportVar;
			}
			if (options.hasOwnProperty('jobProfile')) {
            	this.jobProfile = options.jobProfile;
            }
        }
	}
    // Require to clone w/ functional Shell
	public getOptions(){
		return {
			"modules" : this.modules ? this.modules : undefined,
			"exportVar" : this.exportVar ? this.exportVar : undefined,
			"jobProfile" : this.jobProfile ? this.jobProfile : undefined,
			//"logLevel" : this.logLevel ? this.logLevel : undefined
		}
	}

	/*
	* DO NOT MODIFY
	* Initialization of the Slots : called ONLY by the constructor.
	*/
	protected initSlots (): void {
		if (this.slotSymbols.length == 0) throw 'ERROR : your task must define at least one slot symbol';
		else {
			for (let sym of this.slotSymbols) {
				this[sym] = this.createSlot(sym);
			}
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
	protected configJob (inputs: typ.stringMap[]): typ.jobOpt {
		let self = this;
	    let jobOpt: typ.jobOpt = {
	    	tagTask: self.staticTag,
	    	script: self.coreScript,
	        modules: self.modules, // (1)
	        exportVar: self.exportVar, // (2)
	        inputs: self.concatJson(inputs) // (3)
	    };
	    return jobOpt;
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Here manage the input(s)
	*/
	protected abstract prepareJob (inputs: typ.stringMap[]): typ.jobOpt

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* To manage the output(s)
	*/
	protected abstract prepareResults (chunkJson: typ.stringMap): typ.stringMap;

	/*
	* DO NOT MODIFY
	* Parse @stringT [string] to find all JSON objects into.
	* Method : look at every character in the string to find the start & the end of JSONs,
	* and then substring according to start & end indices. The substrings are finally converted into JSONs.
	* Returns a list of JSON objects @jsonTab.
	* for tests = zede}trgt{"toto" : { "yoyo" : 3}, "input" : "tototo\ntititi\ntatata"} rfr{}ojfr
	*/
	private findJson (stringT: string): typ.stringMap[] {
		if (typeof stringT !== 'string') throw 'ERROR : @stringT is not a string';
		var toParse: string = stringT; // copy of string
		var open: string = '{', close: string = '}';
		var jsonStart: number = -1, jsonEnd: number = -1;
		var counter: number = 0;
		var sub_toParse: string;
		var jsonTab: typ.stringMap[] = [];
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
						var myJson: typ.stringMap = this.parseJson(sub_toParse);
						if (myJson === null) throw "WARNING : make sure your data contains well writing \"\\n\" !";
						jsonTab.push(myJson);
						return jsonTab;
					}
				}
			}
			if (jsonEnd === -1) toParse = toParse.substring(jsonStart+1) // continue the research without all before the first {
		}
		return jsonTab;
	}

	/*
	* DO NOT MODIFY
	* Find all the slots in @this and return them into an array (map method).
	*/
	public getSlots (): typ.slot[] {
		return this.slotSymbols.map((sym, i, arr) => {
			return this[sym];
		});
	}

	/*
	* DO NOT MODIFY
	* Process method.
	* Use @chunk from @aSlot to search for one JSON, and then call the run method.
	*/
	private process (chunk: any, aSlot: typ.slot): events.EventEmitter {
		if (! typ.isSlot(aSlot)) throw 'ERROR : @aSlot is not a slot';
		var emitter = new events.EventEmitter();
		var self = this; // self = this = TaskObject =//= aSlot = a slot of self
		var slotArray: typ.slot[] = this.getSlots();
		self.feed_streamContent(chunk, aSlot);

		let run: boolean = undefined;

		for (let slt of slotArray) { // for each slot
			logger.silly(`slotArray[i] :\n${util.format(slt)}`);
			self.feed_jsonContent(slt);

			// if no JSON has been detected at all :
			if (slt.jsonContent.length < 1) run = false;
			else { // if there are one or more than one JSON in the slt.jsonContent :
				if (typeof run === 'undefined') run = true; // if run is still undefined
				if (slt.jsonContent.length > 1) 
					logger.warn(`More than one JSON detected in slot ${slt.symbol} : taking the first JSON only !`);
			}
		}

		if (run) {
			// inputArray is an array. Each element is the first JSON detected in the jsonContent of each slot
			var inputArray: typ.stringMap[] = slotArray.map((slt) => slt.jsonContent[0] );
			logger.debug(`inputArray = \n ${util.format(inputArray)}`);

			self.run(inputArray)
			.on('treated', (results) => {
				// remove the jsonContents of every slots :
				self.applyOnArray(self.remove_jsonContents, slotArray);
				emitter.emit('processed', results);
			})
			.on('error', (err) => {
				emitter.emit('error', err);
			})
			.on('stderrContent', (buf) => {
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
	* Fill the streamContent of @aSlot with @chunk
	*/
	private feed_streamContent (chunk: any, aSlot: typ.slot): void {
		if (typeof chunk == "undefined") throw 'ERROR : Chunk is ' + chunk;
		if (Buffer.isBuffer(chunk)) chunk = chunk.toString(); // chunk can be either string or buffer but we need a string
		if (! typ.isSlot(aSlot)) throw 'ERROR : @aSlot is not a slot';

		aSlot.streamContent += chunk;
		logger.debug(`streamContent :${aSlot.streamContent}`);
	}

	/*
	* DO NOT MODIFY
	* Fill the jsonContent of @aSlot thanks to the findJson method.
	*/
	private feed_jsonContent (aSlot: typ.slot): void {
		if (! typ.isSlot(aSlot)) throw 'ERROR : @aSlot is not a slot';

		// if jsonContent has already JSONs (at least one) : no need to find others
		if (aSlot.jsonContent.length >= 1) return;

		var jsonTab = this.findJson(aSlot.streamContent); // search for JSON
		logger.debug(`jsonTab = \n ${util.format(jsonTab)}`);

		if (jsonTab.length < 1) return; // if there is no JSON at all, bye bye

		aSlot.jsonContent = aSlot.jsonContent.concat(jsonTab); // take all the JSONs detected
		aSlot.streamContent = '';
		
		logger.debug(`jsonContent of ${aSlot.symbol} = \n${util.format(aSlot.jsonContent)}`);
	}

	/*
	* DO NOT MODIFY
	* (1) prepare the job = by setting options & creating files for the task
	* (2) run
	* (3) receive all the data
	* (4) at the end of the reception, prepare the results
	* (5) only when (4) is finished : push the results to the subtasks
	*/
	private run (jsonValue: typ.stringMap[]): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this;
		var jobOpt: typ.jobOpt = self.prepareJob(jsonValue); // (1) // jsonValue = array of JSONs
		if (jobOpt.inputs.hasOwnProperty('uuid')) { // in case a uuid is passed
			jobOpt['namespace'] = jobOpt.inputs.uuid;
			delete jobOpt.inputs['uuid'];
		}

		if (this.jobProfile)
			jobOpt['jobProfile'] = this.jobProfile;

		logger.debug(`jobOpt = ${JSON.stringify(jobOpt)}`);
		var j = self.jobManager.push(jobOpt); // (2)
		j.on('completed', (stdout, stderr, jobObject) => {
			if (stderr) {
                stderr.on('data', (buf) => {
                	logger.error(`stderr content = \n ${buf.toString()}`)
                    emitter.emit('stderrContent', buf);
                });
            }
            var chunk: string = '';
            stdout.on('data', (buf) => { chunk += buf.toString(); }); // (3)
            stdout.on('end', () => { // (4)
            	self.async(function () {
            		var res = self.prepareResults(self.parseJson(chunk));
            		if (typeof jobOpt.namespace !== 'undefined') res['uuid'] = jobOpt.namespace;
            		return res;
            	}).on('end', (results) => { // (5)
            		self.goReading = true;
            		self.push(JSON.stringify(results)); // pushing string = activate the "_read" method
            		emitter.emit('treated', results);
            	});
            });
        });
        j.on('jobError', (stdout, stderr, j) => {
        	logger.error(`job ${j.id} stderr:${stderr}`);
            emitter.emit('error', stderr, j.id);
        });
        j.on('lostJob', (msg, j) => {
        	logger.error(`job ${j.id} : ${msg}`);
        	emitter.emit('lostJob', msg, j.id);
        });
		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Necessary to use task.pipe(anotherTask)
	*/
	public _read (size?: number): any {
		logger.debug(`>>>>> reading from ${this.staticTag}`);
		if (this.goReading) {
			logger.debug(`>>>>> read: this.goReading is F from ${this.staticTag}`);
            this.goReading = false;
        }
	}

	/*
	* Overcharging the pipe method to take the outKey of the slot destination (if this is a slot)
	*/
	public pipe (destination, options?: { end?: boolean }) {
		if (typ.isSlot(destination)) {
			this.outKey = destination.symbol;
		}
		return super.pipe(destination, options);
	}

	/*
	* DO NOT MODIFY
	* Slot = a new writable stream to receive one type of data (= one input)
	*/
	private createSlot (symbol: string): stream.Writable {
		if (typeof symbol !== 'string') throw 'ERROR : @symbol must be a string';
		var thisTask = this; // keep the reference to this task

		class slot extends stream.Writable { // a slot is a Duplex
			symbol: string; // key of the input = id of the input
		    streamContent: string = '';
		    jsonContent: typ.stringMap[] = []; // array of JSONs
			constructor (symbol: string, options?: any) {
		    	super(options);
		    	if (typeof symbol == 'undefined') throw 'ERROR : a symbol must be specified !';
		    	this.symbol = symbol;
		    }
		    _write (chunk: any, encoding?: string, callback?: any): void {
		    	thisTask.process(chunk, this)
		    	.on('processed', (res) => {
					thisTask.emit('processed', res);
				})
				.on('error', (err) => {
					thisTask.emit('err', err);
				})
				.on('stderrContent', (buf) => {
					thisTask.emit('stderrContent', buf);
				})
				.on('lostJob', (msg, jid) => {
	        		thisTask.emit('lostJob', msg, jid);
	    		});
		    	callback();
		    }
		}

		return new slot(symbol);
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
	private concatJson (jsonTab: typ.stringMap[]): typ.stringMap {
		var newJson: typ.stringMap = {};
		logger.debug(`json array to concatenate = \n ${util.format(jsonTab)}`);

		for (let i = 0; i < jsonTab.length; i ++) {
	    	for (let key in jsonTab[i]) {
	    		if (newJson.hasOwnProperty(key)) throw 'ERROR with jsonTab in concatJson() : 2 JSON have the same key';
	    		newJson[key] = jsonTab[i][key];
	    	}
	    }
	    logger.debug(`newJson = \n${util.format(newJson)}`);
	    return newJson;
	}

	/*
	* DO NOT MODIFY
	* Remove the first element of the jsonContent of @aSlot used for the computation.
	*/
	private shift_jsonContent (aSlot: typ.slot): void {
		if (! typ.isSlot(aSlot)) throw 'ERROR : @aSlot is not a slot';
		aSlot.jsonContent.shift();
	}

	/*
	* DO NOT MODIFY
	* Remove all the JSON in jsonContent of the @aSlot.
	*/
	private remove_jsonContents (aSlot: typ.slot): void {
		if (! typ.isSlot(aSlot)) throw 'ERROR : @aSlot is not a slot';
		aSlot.jsonContent = [];
	}


	/*
	* DO NOT MODIFY
	* Open a json file and return its content if no error otherwise return null
	*/
	public parseJsonFile (file: string): typ.stringMap {
		try {
			var dict: typ.stringMap = jsonfile.readFileSync(file, 'utf8');
			return dict;
		} catch (err) {
			logger.error(`in parseJsonFile() :\n ${err}`);
			return null;
		}
	}

	/*
	* DO NOT MODIFY
	* Parse @data to check if it is in JSON format.
	*/
	public parseJson (data: string): typ.stringMap {
		try { return JSON.parse(data) }
		catch (err) {
			logger.error(`in parseJsonFile() :\n ${err}`);
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
			logger.error(`while writing the file ${file} :\n ${err}`);
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
			logger.error( `while creating the directory ${dir}:\n${err}`);
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
		rs.on("error", (err) => { logger.error(`in copyFile while reading the file ${src }:\n${err}`);});
		ws.on("error", (err) => { logger.error(`in copyFile while writing the file ${dest}:\n${err}`);});
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

