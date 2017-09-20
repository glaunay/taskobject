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
"use strict";
// TODO
// - git ignore node_modules
// - kill method (not necessary thanks to the new jobManager with its "engines")
// - implement the writing of more than one input : this.write_inputs()
// - see how to use the "null" value (when we call the pushClosing() method)
const events = require("events");
const stream = require("stream");
const jsonfile = require("jsonfile");
const JSON = require("JSON");
const fs = require("fs");
var b_test = false; // test mode
class Task extends stream.Duplex {
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Initialize the task parameters.
    */
    constructor(jobManager, jobProfile, syncMode, options) {
        super(options);
        if (!jobManager)
            throw 'ERROR : a job manager must be specified';
        this.jobManager = jobManager;
        this.staticTag = 'simple';
        this.jobProfile = jobProfile;
        if (syncMode = true)
            this.proFunc = this.__syncProcess__;
        else
            this.proFunc = this.__process__;
        this.streamContent = '';
        this.jsonContent = [];
        this.goReading = false;
        this.nextInput = false;
        this.settFile = __dirname + '/data/settings.json';
        this.firstSet(this.__parseJson__(this.settFile));
        this.slotArray = [];
    }
    /*
    * To (in)activate the test mode : (in)activate all the console.log/dir
    */
    testMode(bool) {
        b_test = bool;
        if (b_test)
            console.log('NEWS : Task test mode is activated');
        else
            console.log('NEWS : Task test mode is off');
    }
    /*
    * DO NOT MODIFY
    * Open a json file and return its content if no error otherwise return null
    */
    __parseJson__(file) {
        try {
            var dict = jsonfile.readFileSync(file, 'utf8');
            return dict;
        }
        catch (err) {
            console.log('ERROR in __parseJson__() : ' + err);
            return null;
        }
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * First set of the task : called by the constructor.
    * data is a literal like { 'author' : 'me', 'settings' : { 't' : 5, 'iterations' : 10 } }
    */
    firstSet(data) {
        if (data) {
            if ('coreScript' in data)
                this.coreScript = __dirname + '/' + data.coreScript;
            else
                this.coreScript = null;
            if ('wait' in data)
                this.wait = data.wait;
            else
                this.wait = true;
            if ('automaticClosure' in data)
                this.automaticClosure = data.automaticClosure;
            else
                this.automaticClosure = false;
            if ('settings' in data)
                this.settings = data.settings;
            else
                this.settings = {};
        }
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Change task parameters according to the keys in data (JSON format) :
    * data is a literal like { 'author' : 'me', 'settings' : { 't' : 5, 'iterations' : 10 } }
    */
    set(data) {
        if (data) {
            if ('coreScript' in data)
                this.coreScript = __dirname + '/' + data.coreScript;
            if ('wait' in data)
                this.wait = data.wait;
            if ('automaticClosure' in data)
                this.automaticClosure = data.automaticClosure;
            if ('settings' in data) {
                for (var key in data.settings) {
                    if (this.settings.hasOwnProperty(key))
                        this.settings[key] = data.settings[key];
                    else
                        throw 'ERROR : cannot set the ' + key + ' property which does not exist in this task';
                }
            }
        }
    }
    /*
    * Create a directory according to @dirPath
    */
    __createDir__(dirPath) {
        try {
            fs.mkdirSync(dirPath);
        }
        catch (err) {
            console.log('ERROR in __createDir__() : ' + err);
        }
    }
    /*
    * Read a file according to @dirPath and return its @content or null if error
    */
    __readFile__(dirPath) {
        try {
            var content = fs.readFileSync(dirPath, 'utf8');
            return content;
        }
        catch (err) {
            console.log('ERROR in __readFile__() : ' + err);
            return null;
        }
    }
    /*
    * Write the @data in the a file according to the @filePath
    */
    __writeFile__(filePath, data) {
        try {
            fs.writeFileSync(filePath, data, "utf8");
        }
        catch (err) {
            console.log('ERROR in __writeFile__() : ' + err);
        }
    }
    /*
    * Write @dict in the @filePath with a JSON format
    */
    __writeJson__(filePath, dict) {
        try {
            jsonfile.writeFileSync(filePath, dict, "utf8");
        }
        catch (err) {
            console.log('ERROR in __writeJson__() : ' + err);
        }
    }
    /*
    * Concatenate JSONs that are in the same array
    */
    __concatJson__(jsonTab) {
        console.log("jsonTab :");
        console.log(jsonTab);
        var newJson = {};
        for (var i = 0; i < jsonTab.length; i++) {
            for (var key in jsonTab[i]) {
                if (newJson.hasOwnProperty(key))
                    throw 'ERROR with jsonTab in __concatJson__ : 2 JSON have the same key';
                newJson[key] = jsonTab[i][key];
            }
        }
        console.log("newjson :");
        console.log(newJson);
        return newJson;
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * According to the parameter this.automaticClosure,
    * close definitely this task or just push the string "null"
    */
    pushClosing() {
        if (this.automaticClosure)
            this.push(null);
        else
            this.push('null');
    }
    /*
    * DO NOT MODIFY
    * Pre-processing of the job.
    * Configure the dictionary to pass to the jobManager.push() function, according to :
    * 	(1) the list of the modules needed
    * 	(2) variables to export in the coreScript
    *	(3) the inputs : stream or string or path in an array of JSONs
    */
    __configJob__(inputs, modules, exportVar) {
        var self = this;
        var jobOpt = {
            'tagTask': self.staticTag,
            'script': self.coreScript,
            'modules': modules,
            'exportVar': exportVar,
            'inputs': self.__concatJson__(inputs) // (3)
        };
        return jobOpt;
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Here are defined all the parameters specific to the task :
    * 	- modules needed
    * 	- variables to export in the batch script
    */
    prepareJob(inputs) {
        var modules = [];
        var exportVar = {};
        return this.__configJob__(inputs, modules, exportVar);
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * To manage the output(s)
    */
    prepareResults(chunk) {
        if (typeof chunk !== 'string')
            chunk = JSON.stringify(chunk);
        var results = {
            'inputFile': chunk
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
    __findJson__(stringT) {
        var toParse = stringT; // copy of string
        var open = '{', close = '}';
        var jsonStart = -1, jsonEnd = -1;
        var counter = 0;
        var sub_toParse;
        var result = {
            "rest": "",
            "jsonTab": []
        };
        /*
        * Check the existence of JSON extremities in @toParse [string].
        * Method :
        * (1) search the indice of the first { in the string
        * (2) search a } from the indice to the end of the string
        */
        var __detectExtremities__ = function (toParse) {
            var open = '{', close = '}';
            var first_open = toParse.search(open); // (1)
            if (first_open === -1)
                return false;
            var next_close = toParse.substring(first_open).search(close); // (2)
            if (next_close === -1)
                return false;
            else
                return true;
        };
        while (__detectExtremities__(toParse)) {
            counter = 0, jsonStart = -1, jsonEnd = -1;
            for (var i = 0; i < toParse.length; i++) {
                if (b_test) {
                    console.log("i = " + i + " ///// to parse [i] = " + toParse[i] + " ///// counter = " + counter);
                    console.log("jsonStart = " + jsonStart + " ///// jsonEnd = " + jsonEnd);
                }
                if (toParse[i].match(open)) {
                    if (counter === 0)
                        jsonStart = i; // if a JSON is beginning
                    counter++;
                }
                if (toParse[i].match(close) && jsonStart !== -1) {
                    counter--;
                    if (counter === 0) {
                        jsonEnd = i;
                        // prepare the JSON object
                        sub_toParse = toParse.substring(jsonStart, jsonEnd + 1);
                        result.jsonTab.push(JSON.parse(sub_toParse));
                        toParse = toParse.replace(sub_toParse, ''); // remove the part of the JSON already parsed
                        break;
                    }
                }
            }
            if (jsonEnd === -1)
                toParse = toParse.substring(jsonStart + 1); // continue the research without all before the first {
        }
        result.rest += toParse;
        return result;
    }
    /*
    * DO NOT MODIFY
    * In response to the superPipe method :
    * use @chunk from @aStream to search for a JSON (at least), and then call the __run__ method.
    */
    __syncProcess__(chunk, aStream) {
        var emitter = new events.EventEmitter();
        this.__feed_streamContent__(chunk, aStream);
        var numOfRun = -1;
        for (var i in this.slotArray) {
            if (b_test) {
                console.log("i : " + i);
                console.log("slotArray[i] : " + this.slotArray[i]);
            }
            this.__feed_jsonContent__(this.slotArray[i]);
            if (numOfRun === -1)
                numOfRun = aStream.jsonContent.length;
            if (aStream.jsonContent.length < numOfRun)
                numOfRun = aStream.jsonContent.length;
        }
        for (var j = 0; j < numOfRun; j++) {
            var inputsTab = [];
            for (var k in this.slotArray) {
                inputsTab.push(this.slotArray[k].jsonContent[j]);
            }
            this.__run__(inputsTab)
                .on('treated', (results) => {
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
    __feed_streamContent__(chunk, aStream) {
        if (typeof chunk == "undefined")
            throw 'ERROR : Chunk is ' + chunk;
        if (Buffer.isBuffer(chunk))
            chunk = chunk.toString(); // chunk can be either string or buffer but we need a string
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
    * Fill the jsonContent of @aStream or @this thanks to the __findJson__ method.
    */
    __feed_jsonContent__(aStream) {
        var self = this;
        var streamUsed = typeof aStream != "undefined" ? aStream : self;
        var results = this.__findJson__(streamUsed.streamContent); // search for JSON
        if (results.jsonTab.length < 1)
            return; // if there is no JSON at all, bye bye
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
    __run__(jsonValue) {
        var emitter = new events.EventEmitter();
        var self = this;
        // if (jsonValue === 'null' || jsonValue === 'null\n') { // (1)
        // 	self.pushClosing();
        // } else {
        var jobOpt = self.prepareJob(jsonValue); // (2) // jsonValue = array of JSONs
        if (b_test) {
            console.log("jobOpt :");
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
            var chunk = '';
            stdout.on('data', buf => { chunk += buf.toString(); }); // (4)
            stdout.on('end', () => {
                self.__async__(self.prepareResults(chunk)).on('end', results => {
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
    * (1) consume chunk
    * (2) look at every JSON object we found into the jsonContent of @this
    * (3) treat it
    */
    __process__(chunk) {
        var emitter = new events.EventEmitter();
        var self = this;
        this.__feed_streamContent__(chunk); // (1)
        this.__feed_jsonContent__(); // (1)
        this.jsonContent.forEach((jsonVal, i, array) => {
            if (b_test)
                console.log('######> i = ' + i + '<#>' + jsonValue + '<######');
            var jsonValue = [jsonVal]; // to adapt to superProcess modifications
            self.__run__(jsonValue) // (3)
                .on('treated', (results) => {
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
    * Necessary to use .pipe(task)
    */
    _write(chunk, encoding, callback) {
        if (b_test)
            console.log('>>>>> write');
        this.__process__(chunk)
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
    _read(size) {
        if (b_test)
            console.log('>>>>> read');
        if (this.goReading) {
            if (b_test)
                console.log('>>>>> read: this.goReading is F');
            this.goReading = false;
        }
    }
    /*
    * The Task on which is realized the superPipe obtains a new input type (a new duplex to receive one type of data)
    */
    superPipe(s) {
        s.addSlot(this);
        return s;
    }
    addSlot(previousTask) {
        class slot extends stream.Duplex {
            constructor(options) {
                super(options);
                this.goReading = false;
                this.streamContent = '';
                this.jsonContent = [];
            }
            _write(chunk, encoding, callback) {
                self.__syncProcess__(chunk, this)
                    .on('processed', s => {
                    self.emit('processed', s);
                })
                    .on('err', s => {
                    self.emit('err', s);
                });
                callback();
            }
            _read(size) { } // we never use this method
        }
        var self = this;
        var stream_tmp = new slot();
        this.slotArray.push(stream_tmp);
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
    kill(managerSettings) {
        var emitter = new events.EventEmitter();
        this.jobManager.stop(managerSettings, this.staticTag)
            .on('cleanExit', function () {
            emitter.emit('cleanExit');
        })
            .on('exit', function () {
            emitter.emit('exit');
        })
            .on('errScancel', function () {
            emitter.emit('errScancel');
        })
            .on('errSqueue', function () {
            emitter.emit('errSqueue');
        });
        if (b_test)
            console.log(emitter);
        return emitter;
    }
    /*
    * DO NOT MODIFY
    * Make a @callback asynchronous
    */
    __async__(callback) {
        var emitter = new events.EventEmitter;
        setTimeout(() => { emitter.emit('end', callback); }, 10);
        return emitter;
    }
    /*
    * Check if @myData is an array (true) or not (false) :
    * 	- if FALSE : apply @myFunc on @myData.
    * 	- if TRUE : apply @myFunc on each element of @myData.
    * WARNING : the argument of @myFunc used with @myData must be the first argument given to @myFunc.
    */
    __applyOnArray__(myFunc, myData) {
        var args = Array.prototype.slice.call(arguments, 2); // extract arguments to run @myFunc and put them into an array
        if (Array.isArray(myData)) {
            var results = [];
            for (var i = 0; i < myData.length; i++) {
                args = args.unshift(myData[i]);
                results.push(myFunc.apply(this, args));
            }
            return results;
        }
        else {
            args = args.unshift(myData);
            return myFunc.apply(this, args);
        }
    }
}
exports.Task = Task;
