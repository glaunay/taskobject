/*
* CLASS TASK
* settFile must be like :
{
	"coreScript": "./data/simple.sh",
	"wait" : true,
	"automaticClosure": false,
	"settings": {}
}


* Usage :
var tk = require('taskObject');
var taskTest = new tk.Task (jobManager, jobProfile);
readableStream.pipe(taskTest).pipe(writableStream);


* Inheritance :
A child class of Task must not override methods like : __method__ ()






*/


// TODO
// - git ignore node_modules
// - kill method (not necessary thanks to the new jobManager with its "engines")
// - implement the writing of more than one input : this.write_inputs()
// - see how to use the "null" value (when we call the pushClosing() method)



import events = require ('events');
import stream = require ('stream');
import jsonfile = require ('jsonfile');
import JSON = require ('JSON');
import fs = require ('fs');
//import {spawn} from 'child_process';
import uuidv4 = require ('uuid/v4');
import path = require ('path');
import deepEqual = require('deep-equal');

declare var __dirname;

var b_test = false; // test mode



export class Task extends stream.Duplex {
	jobManager: any; // engineLayer
	staticTag: string; // tagTask : must be unique
	jobProfile: {}; // including partition, qos, uid, gid (given by jobManager)
	syncMode: boolean; // define the mode : async or not (see next line)
	processFunc: Function; // async (__process__) or synchronous (__syncProcess__) depending on the mode
	streamContent: string; // content of the stream (concatenated chunk)
	jsonContent: {}[]; // all the whole JSONs found in streamContent
	//private goReading: boolean; // indicate when the read function can be used
	goReading: boolean; // for tests
	private nextInput: boolean; // false when the input is not complete
	settFile: string; // settings file path
	coreScript: string; // core script path
	wait: boolean; // always TRUE for now = we need to wait all the data before beginning to run
	automaticClosure: boolean;
	settings: {}; // specific to each task // usefull ?
	slotArray: any[]; // array of streams, each corresponding to an input (piped on this Task)

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Initialize the task parameters with values gived by user.
	*/
	constructor (jobManager, jobProfile: {}, syncMode: boolean, options?: any) {
		super(options);
		if (typeof jobManager == "undefined") throw 'ERROR : a job manager must be specified';
		if (typeof jobProfile == "undefined") throw 'ERROR : a job profile must be specified (even null is correct)';
		if (typeof syncMode == "undefined") throw 'ERROR : a mode must be specified (sync = true // async = false)';
		this.jobManager = jobManager;
		this.jobProfile = jobProfile;
		this.syncMode = syncMode;
		if (this.syncMode === true) this.processFunc = this.__syncProcess__;
		else this.processFunc = this.__process__;
		this.settFile = __dirname + '/data/settings.json';
		this.init(this.__parseJson__(this.settFile));
		this.staticTag = 'simple';
	}

	/*
	* DO NOT MODIFY
	* To (in)activate the test mode : (in)activate all the console.log/dir
	*/
	testMode (bool: boolean): void {
		b_test = bool;
		if (b_test) console.log('NEWS : Task test mode is activated');
		else console.log('NEWS : Task test mode is off')
	}

	/*
	* DO NOT MODIFY
	* Open a json file and return its content if no error otherwise return null
	*/
	__parseJson__ (file: string): {} {
		try {
			var dict: {} = jsonfile.readFileSync(file, 'utf8');
			return dict;
		} catch (err) {
			console.log('ERROR in __parseJson__() : ' + err);
			return null;
		}
	}

	/*
	* DO NOT MODIFY
	* Initialization of the task : called by the constructor.
	* Some values cannot be changed (2), some other values can, according to @data (1).
	* @data is a literal like { 'author' : 'me', 'settings' : { 't' : 5, 'iterations' : 10 } }
	*/
	init (data: any): void {
		if (data) { // (1)
			if ('coreScript' in data) this.coreScript = __dirname + '/' + data.coreScript;
			else this.coreScript = null;
			if ('wait' in data) this.wait = data.wait;
			else this.wait = true;
			if ('automaticClosure' in data) this.automaticClosure = data.automaticClosure;
			else this.automaticClosure = false;
			if ('settings' in data) this.settings = data.settings;
			else this.settings = {};
		}
		// (2)
		this.streamContent = '';
		this.jsonContent = [];
		this.goReading = false;
		this.nextInput = false;
		this.slotArray = [];
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Change task parameters according to the keys in data (JSON format) :
	* data is a literal like { 'author' : 'me', 'settings' : { 't' : 5, 'iterations' : 10 } }
	*/
	set (data: any): void {
		if (data) {
			if ('coreScript' in data) this.coreScript = __dirname + '/' + data.coreScript;
			if ('wait' in data) this.wait = data.wait;
			if ('automaticClosure' in data) this.automaticClosure = data.automaticClosure;
			if ('settings' in data) {
				for (var key in data.settings) {
					if (this.settings.hasOwnProperty(key)) this.settings[key] = data.settings[key];
					else throw 'ERROR : cannot set the '+ key +' property which does not exist in this task';
				}
			}
		}
	}

	/*
	* DO NOT MODIFY
	* Create a directory according to @dirPath
	*/
	__createDir__ (dirPath: string): void {
		try { fs.mkdirSync(dirPath); }
		catch (err) { console.log('ERROR in __createDir__() : ' + err); }
	}

	/*
	* DO NOT MODIFY
	* Read a file according to @dirPath and return its @content or null if error
	*/
	__readFile__ (dirPath: string): string {
		try {
			var content = fs.readFileSync(dirPath, 'utf8');
			return content;
		} catch (err) {
			console.log('ERROR in __readFile__() : ' + err);
			return null;
		}
	}

	/*
	* DO NOT MODIFY
	* Write the @data in the a file according to the @filePath
	*/
	__writeFile__ (filePath: string, data: string): void {
		try { fs.writeFileSync(filePath, data); }
		catch (err) { console.log('ERROR in __writeFile__() : ' + err); }
	}

	/*
	* DO NOT MODIFY
	* Write @dict in the @filePath with a JSON format
	*/
	__writeJson__ (filePath: string, dict: {}): void {
		try { jsonfile.writeFileSync(filePath, dict, "utf8"); }
		catch (err) { console.log('ERROR in __writeJson__() : ' + err); }
	}

	/*
	* DO NOT MODIFY
	* Concatenate JSONs that are in the same array
	*/
	__concatJson__ (jsonTab: {}[]): {} {
		var newJson: {} = {};
		for (var i = 0; i < jsonTab.length; i ++) {
	    	for (var key in jsonTab[i]) {
	    		if (newJson.hasOwnProperty(key)) throw 'ERROR with jsonTab in __concatJson__ : 2 JSON have the same key';
	    		newJson[key] = jsonTab[i][key];
	    	}
	    }
	    if (b_test) {
		    console.log("newjson :");
		    console.log(newJson);
		}
	    return newJson;
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* According to the parameter this.automaticClosure,
	* close definitely this task or just push the string "null"
	*/
	pushClosing (): void {
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
	__configJob__ (inputs: {}[], modules: string[], exportVar: {}): Object {
		var self = this;
	    var jobOpt = {
	    	'tagTask' : <string> self.staticTag,
	    	'script' : <string> self.coreScript,
	        'modules' : <[string]> modules, // (1)
	        'exportVar' : <{}> exportVar, // (2)
	        'inputs' : <{}> self.__concatJson__(inputs) // (3)
	    };
	    return jobOpt;
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Here are defined all the parameters specific to the task :
	* 	- modules needed
	* 	- variables to export in the batch script
	*/
	prepareJob (inputs: {}[]): Object {
		var modules: string[] = [];
		var exportVar: {} = {};
		return this.__configJob__(inputs, modules, exportVar);
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* To manage the output(s)
	*/
	prepareResults (chunk: any): string {
		if (typeof chunk !== 'string') chunk = JSON.stringify(chunk);
		var results: {} = {
			'inputFile' : chunk
		};
    	return JSON.stringify(results);
	}

	/*
	* DO NOT MODIFY
	* Parse @stringT [string] to find all JSON objects into.
	* Method : look at every character in the string to find the start & the end of JSONs,
	* and then substring according to start & end indices. The substrings are finally converted into JSONs.
	* Returns in @results [literal] a list of JSON objects [@results.jsonTab] and @stringT without all JSON substrings [@results.rest].
	* for tests = zede}trgt{"toto" : { "yoyo" : 3}, "input" : "tototo\ntititi\ntatata"} rfr{}ojfr
	*/
	__findJson__ (stringT: string): any {
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
		var __detectExtremities__ = function (toParse: string): boolean {
			var open: string = '{', close: string = '}';
			var first_open: number = toParse.search(open); // (1)
			if (first_open === -1) return false;
			var next_close: number = toParse.substring(first_open).search(close); // (2)
			if (next_close === -1) return false;
			else return true;
		}

		while (__detectExtremities__(toParse)) {
			counter = 0, jsonStart = -1, jsonEnd = -1;
			for (var i = 0; i < toParse.length; i++) { // for each character in @toParse
				if (b_test) {
					console.log("i = " + i + " ///// to parse [i] = " + toParse[i] + " ///// counter = " + counter);
					console.log("jsonStart = " + jsonStart + " ///// jsonEnd = " + jsonEnd)
				}
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
						result.jsonTab.push(JSON.parse(sub_toParse));

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
	* Use @chunk from @aStream to search for one JSON (at least), and then call the __run__ method.
	*/
	__syncProcess__ (chunk: any, aStream: any): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this; // self = this = TaskObject =//= aStream = a slot of self
		self.__feed_streamContent__(chunk, aStream);

		var numOfRun: number = -1;
		for (var i in self.slotArray) {
			var slot_i = self.slotArray[i];
			if (b_test) {
				console.log("i : " + i);
				console.log("slotArray[i] : " + slot_i);
			}
			self.__feed_jsonContent__(slot_i);
			// take the length of the smallest jsonContent :
			if (numOfRun === -1) numOfRun = slot_i.jsonContent.length;
			if (slot_i.jsonContent.length < numOfRun) numOfRun = slot_i.jsonContent.length;
		}
		if (b_test) console.log("numOfRun : " + numOfRun);

		for (var j = 0; j < numOfRun; j ++) { // not more than the length of the smallest jsonContent
			if (b_test) {
				console.log("%%%%%%%%%%%%% here synchronous process");
				console.log("j : " + j);
			}
			var inputsTab = [];
			for (var k in self.slotArray) { // take the first JSON of each slot
				inputsTab.push(self.slotArray[k].jsonContent[j]);
			}
			// for tests
			inputsTab = [ { "inputFile": '{\n"myData line 1" : "titi"\n}\n' }, { "inputFile2": '{\n"myData line 1" : "tata"\n}\n' } ]
			// end of tests
			if (b_test) console.log(inputsTab);
			self.__run__(inputsTab)
			.on('treated', (results) => {
				self.__applyOnArray__(self.__shift_jsonContent__, self.slotArray);
				emitter.emit('processed');
			})
			.on('err', (err) => {
				emitter.emit('error');
			});
		}
		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Fill the streamContent of @aStream or @this with @chunk
	*/
	__feed_streamContent__ (chunk: any, aStream?: any): void {
		if (typeof chunk == "undefined") throw 'ERROR : Chunk is ' + chunk;
		if (Buffer.isBuffer(chunk)) chunk = chunk.toString(); // chunk can be either string or buffer but we need a string
		
		var self = this;
		var streamUsed = typeof aStream != "undefined" ? aStream : self;

		streamUsed.streamContent += chunk;
		if (b_test) {
			console.log('streamContent :');
			console.log(streamUsed.streamContent);
		}
	}

	/*
	* DO NOT MODIFY
	* Remove the first element of the jsonContent of @aStream used for the computation.
	*/
	__shift_jsonContent__ (aStream: any): void {
		aStream.jsonContent.shift();
	}

	/*
	* DO NOT MODIFY
	* Fill the jsonContent of @aStream or @this thanks to the __findJson__ method.
	*/
	__feed_jsonContent__ (aStream?: any): void {
		var self = this;
		var streamUsed = typeof aStream != "undefined" ? aStream : self;

		var results = this.__findJson__(streamUsed.streamContent); // search for JSON
		if (b_test) console.log(results);
		if (results.jsonTab.length < 1) return; // if there is no JSON at all, bye bye
		streamUsed.jsonContent = streamUsed.jsonContent.concat(results.jsonTab); // take all the JSON detected ...
		streamUsed.streamContent = results.rest; // ... and keep the rest into streamContent
		
		if (b_test) {
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
	__run__ (jsonValue: {}[]): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this;
		// if (jsonValue === 'null' || jsonValue === 'null\n') { // (1)
		// 	self.pushClosing();
		// } else {
			var jobOpt: any = self.prepareJob(jsonValue); // (2) // jsonValue = array of JSONs
			if (b_test) {
				console.log("jobOpt :")
				console.log(jobOpt);
			}
			var j = self.jobManager.push(self.jobProfile, jobOpt); // (3)
			j.on('completed', (stdout, stderr, jobObject) => {
				if (stderr) {
	                stderr.on('data', buf => {
	                    console.error('stderr content : ');
	                    console.error(buf.toString());
	                });
	            }
	            var chunk: string = '';
	            stdout.on('data', buf => { chunk += buf.toString(); }); // (4)
	            stdout.on('end', () => {
	            	self.__async__(self.prepareResults(chunk)).on('end', results => { // (5)
	            		self.goReading = true;
	            		self.push(results); // pushing string = activate the "_read" method
	            		emitter.emit('treated', results);
	            	});
	            });
	        });
	        j.on('error', (e, j) => {
	            console.log('job ' + j.id + ' : ' + e);
	            emitter.emit('error', e, j.id);
	        });
		// }
		return emitter;
	}


	/*
	* DO NOT MODIFY
	* (1) use @aStream (first choice) or @this (second choice)
	* (2) consume @chunk
	* (3) look at every JSON object we found into the @jsonContent of @streamUsed
	* (4) treat it
	* (5) remove the jsonContent
	*/
	__process__ (chunk: any, aStream?: any): events.EventEmitter {
		var emitter = new events.EventEmitter();
		var self = this;
		var streamUsed = typeof aStream != "undefined" ? aStream : self; // (1)
		this.__feed_streamContent__(chunk, streamUsed); // (2)
		this.__feed_jsonContent__(streamUsed); // (2)

		streamUsed.jsonContent.forEach((jsonVal, i, array) => { // (3)
			if (b_test) console.log("%%%%%%%%%%%% hello i am processing asynchronous");
			if (self.syncMode === true) {
				console.log("WARNING : ASYNC process method is running for an object configured in SYNC mode");
				console.log("WARNING : (due to the used of write or pipe method)");
				//console.log(this);
			}
			if (b_test) console.log('######> i = ' + i + '<#>' + jsonValue + '<######');
			var jsonValue = [jsonVal]; // to adapt to superProcess modifications
			self.__run__(jsonValue) // (4)
			.on('treated', (results) => {
				self.__shift_jsonContent__(streamUsed); // (5)
				emitter.emit('processed');
			})
			.on('err', (err) => {
				emitter.emit('error');
			});
		});
		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Necessary to use anotherTask.pipe(task)
	*/
	_write (chunk: any, encoding?: string, callback?: any): Task {
		if (b_test) console.log('>>>>> write');
		this.__process__(chunk) // obligatory asynchronous when using a anotherTask.pipe(this)
		.on('processed', s => {
			this.emit('processed', s);
		})
		.on('err', s => {
			this.emit('err', s);
		});
		callback();
		return this;
	}


	/*
	* DO NOT MODIFY
	* Necessary to use task.pipe(anotherTask)
	*/
	_read (size?: number): any {
		if (b_test) console.log('>>>>> read');
		if (this.goReading) {
			if (b_test) console.log('>>>>> read: this.goReading is F');
            this.goReading = false;
        }
	}

	/*
	* DO NOT MODIFY
	* Add a slot to the Task on which is realized the superPipe (@s).
	* So @s must be an instance of TaskObject !
	*/
	superPipe (s: Task): Task {
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
	addSlot (previousTask: Task): void {
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
		    	if (b_test) {
			    	console.log("processFunc = ");
			    	console.log(self.processFunc);
			    }
		    	self.processFunc(chunk, this)
		    	.on('processed', s => {
					self.emit('processed', s);
				})
				.on('err', s => {
					self.emit('err', s);
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
	kill (managerSettings): events.EventEmitter {
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

	    if (b_test) console.log(emitter);
	    return emitter;
	}



	/*
	* DO NOT MODIFY
	* Make a @callback asynchronous
	*/
	__async__ (callback: any): events.EventEmitter {
		var emitter = new events.EventEmitter;
		setTimeout(() => { emitter.emit('end', callback); }, 10);
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
	__applyOnArray__ (myFunc: Function, myData: any): any {
		var self = this;
		var args = Array.prototype.slice.call(arguments, 2); // (1)
		if (Array.isArray(myData)) { // (2)
			var results = [];
			for (var i in myData) { // (3)
				args.unshift(myData[i]);
				results.push(myFunc.apply(self, args));
			}
			return results;
		} else { // (4)
			args = args.unshift(myData);
			return myFunc.apply(self, args);
		}
	}

}










