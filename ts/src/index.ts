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
	jobProfile: {} // including partition, qos, uid, gid (given by jobManager)
	streamContent: string; // content of the input gived by the stream
	//private goReading: boolean; // indicate when the read function can be used
	goReading: boolean; // for tests
	private nextInput: boolean; // false when the input is not complete
	settFile: string; // settings file path
	coreScript: string; // core script path
	wait: boolean; // always TRUE for now = we need to wait all the data before beginning to run
	automaticClosure: boolean;
	settings: {}; // specific to each task // usefull ?
	streamsPipedArray: stream.Duplex[]; // array of streams, each corresponding to an input (piped on this Task)
	nStreamPiped: number; // number of stream used in streamsArray

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Initialize the task parameters.
	*/
	constructor (jobManager, jobProfile: {}, options?: any) {
		super(options);
		if (! jobManager) throw 'ERROR : a job manager must be specified';
		this.jobManager = jobManager;
		this.staticTag = 'simple';
		this.jobProfile = jobProfile;
		this.streamContent = '';
		this.goReading = false;
		this.nextInput = false;
		this.settFile = __dirname + '/data/settings.json';
		this.firstSet(this.__parseJson__(this.settFile));
		this.streamsPipedArray = [];
		this.nStreamPiped = 0;
	}

	/*
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
	* MUST BE ADAPTED FOR CHILD CLASSES
	* First set of the task : called by the constructor.
	* data is a literal like { 'author' : 'me', 'settings' : { 't' : 5, 'iterations' : 10 } }
	*/
	firstSet (data: any): void {
		if (data) {
			if ('coreScript' in data) this.coreScript = __dirname + '/' + data.coreScript;
			else this.coreScript = null;
			if ('wait' in data) this.wait = data.wait;
			else this.wait = true;
			if ('automaticClosure' in data) this.automaticClosure = data.automaticClosure;
			else this.automaticClosure = false;
			if ('settings' in data) this.settings = data.settings;
			else this.settings = {};
		}
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
	* Create a directory according to @dirPath
	*/
	__createDir__ (dirPath: string): void {
		try { fs.mkdirSync(dirPath); }
		catch (err) { console.log('ERROR in __createDir__() : ' + err); }
	}

	/*
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
	* Write the @data in the a file according to the @filePath
	*/
	__writeFile__ (filePath: string, data: string): void {
		try { fs.writeFileSync(filePath, data, "utf8"); }
		catch (err) { console.log('ERROR in __writeFile__() : ' + err); }
	}

	/*
	* Write @dict in the @filePath with a JSON format
	*/
	__writeJson__ (filePath: string, dict: {}): void {
		try { jsonfile.writeFileSync(filePath, dict, "utf8"); }
		catch (err) { console.log('ERROR in __writeJson__() : ' + err); }
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
	*	(3) the inputs : stream or string or path
	*/
	__configJob__ (inputs: any, modules: string[], exportVar: {}): Object {
	    var jobOpt = {
	    	'tagTask' : <string> this.staticTag,
	    	'script' : <string> this.coreScript,
	        'modules' : <[string]> modules, // (1)
	        'exportVar' : <{}> exportVar, // (2)
	        'inputs' : <{}> inputs // (3)
	    };
	    return jobOpt;
	}

	/*
	* MUST BE ADAPTED FOR CHILD CLASSES
	* Here are defined all the parameters specific to the task :
	* 	- modules needed
	* 	- variables to export in the batch script
	*/
	prepareTask (inputs: any): Object {
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
			'input' : chunk
		};
    	return JSON.stringify(results);
	}

	/*
	* DO NOT MODIFY
	* Execute all the calculations
	*/
	__run__ (jobOpt: {}): events.EventEmitter {
		var self = this;
		var emitter = new events.EventEmitter();
		var j = self.jobManager.push(self.jobProfile, jobOpt);
		j.on('completed', (stdout, stderr, jobObject) => {
			if(stderr) {
                stderr.on('data', buf => {
                    console.log('stderr content : ');
                    console.log(buf.toString());
                });
            }
            var chunk: string = '';
            stdout.on('data', buf => { chunk += buf.toString(); });
            stdout.on('end', () => {
            	self.__async__(self.prepareResults(chunk)).on('end', results => {
            		emitter.emit('jobCompletion', results, jobObject);
            	});

            });
		})
		j.on('error', (e, j) => {
            console.log('job ' + j.id + ' : ' + e);
            emitter.emit('error', e, j.id);
        });
		return emitter;
	}


	/*
	* DO NOT MODIFY
	* Parse @toParse [string] to find all JSON objects into.
	* Method : look at every character in the string to find the start & the end of JSONs,
	* and then substring according to start & end indices. The substrings are finally converted into JSONs.
	* Returns in @results [literal] a list of JSON objects [@results.jsonTab] and toParse without all JSON substrings [@results.rest].
	* for tests = zede}trgt{"toto" : { "yoyo" : 3}, "input" : "tototo\ntititi\ntatata"} rfr{}ojfr
	*/
	__stringToJson__ (stringT: string): any {
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
	* Check the existence of a JSON in a string.
	* Method : search the indice of the first { in the string. Then search a } from the indice to the end of the string.
	*/
	var __jsonAvailable__ = function (toParse: string): boolean {
		var open: string = '{', close: string = '}';
		// search the first '{'
		var first_open: number = toParse.search(open);
		if (first_open === -1) return false;
		// search a '}' from the first '{' to the end
		var next_close: number = toParse.substring(first_open).search(close);
		if (next_close === -1) return false;
		else return true;
	}

	while (__jsonAvailable__(toParse)) { // while we find a { and a } after
		counter = 0, jsonStart = -1, jsonEnd = -1;
		for (var i = 0; i < toParse.length; i++) {
			if (b_test) {
				console.log("i = " + i + " ///// to parse [i] = " + toParse[i] + " ///// counter = " + counter);
				console.log("jsonStart = " + jsonStart + " ///// jsonEnd = " + jsonEnd)
			}
			if (toParse[i].match(open)) {
				if (counter === 0) {
					jsonStart = i; // if a JSON is beginning
				}
				counter ++;
			}
			// looking for a } only if a { was found before
			if (toParse[i].match(close) && jsonStart !== -1) {
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
		// continue the research without all before the first {
		if (jsonEnd === -1) toParse = toParse.substring(jsonStart+1)
	}
	result.rest += toParse;
	return result;
}


	/*
	* DO NOT MODIFY
	* Realize all the checks and preparations before running.
	* Steps :
	* 	(1) concatenate @chunk [string] until an input is completed (if we found JSON object(s)).
	* 	(2) then look at every JSON object we found to :
	* 		(3) prepare the task = by setting options & creating files for the task
	*		(4) run
	*/
	__processing__ (chunk: string): events.EventEmitter {
		var self = this;
		if (! chunk) throw 'ERROR : Chunk is ' + chunk; // if null or undefined
		var emitter = new events.EventEmitter();
		self.streamContent += chunk; // (1)
		if (b_test) {
			console.log('streamContent :');
			console.log(self.streamContent);
		}
		var resJsonParser = self.__stringToJson__(self.streamContent); // (1)
		self.streamContent = resJsonParser.rest;
		var jsonTab = resJsonParser.jsonTab;
		if (b_test) {
			console.log('jsonTab :');
			console.dir(jsonTab);
		}

		jsonTab.forEach((jsonValue, i, array) => { // (2)
			if (b_test) console.log('######> i = ' + i + '<#>' + jsonValue + '<######');
			if (jsonValue === 'null' || jsonValue === 'null\n') { // if end of the stream by push(null)
				self.pushClosing();
			} else {
				var jobOpt: any = self.prepareTask(jsonValue); // (3)
				if (b_test) console.log(jobOpt);

				self.__run__(jobOpt) // (4)
				.on('jobCompletion', (results, jobObject) => {
					self.goReading = true;
					this.push(results); // pushing string = activate the "_read" method
					emitter.emit('processed', results);
				})
				.on('error', err => {
					emitter.emit('err');
				});
			}
		});
		return emitter;
	}

	/*
	* DO NOT MODIFY
	* Necessary to use .pipe(task)
	*/
	_write (chunk: any, encoding?: string, callback?: any): Task {
		// chunk can be either string or buffer but we need a string
		if (Buffer.isBuffer(chunk)) chunk = chunk.toString();

		if (b_test) console.log('>>>>> write');
		this.__processing__(chunk)
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
	* Necessary to use task.pipe()
	*/
	_read (size?: number): any {
		if (b_test) console.log('>>>>> read');
		if (this.goReading) { // false
			if (b_test) console.log('>>>>> read: this.goReading is F');
            this.goReading = false;
        }
	}

	/*
	* The Task on which is realized the superPipe obtains a new input type (a new duplex to receive one type of data)
	*/
	/*superPipe (s: Task): Task {
		// a basique duplex :
		class myDuplex extends stream.Duplex {
		    waiting: boolean;
			constructor (options?: any) {
		    	super(options);
		    	this.waiting = false;
		    }
		    _write (chunk: any, encoding?: string, callback?: any): void {
		    	if (Buffer.isBuffer(chunk)) chunk = chunk.toString();
		        this.waiting = false;
		    	this.push(chunk);
		    	callback();
		    }
			_read (size?: number): void {
				if (!this.waiting) this.waiting = true;
			}
		}
		var stream_tmp = new myDuplex();
		s.nStreamPiped ++;
		s.streamsPipedArray.push(stream_tmp);
		this.pipe(s.streamsPipedArray[s.nStreamPiped-1]);
		return s;
	}
*/

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

}



