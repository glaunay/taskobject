/*
* CLASS TASK
* settFile must be like :
{
    "coreScript": "./data/simple.sh",
    "jobsArray" : [],
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
const events = require("events");
const stream = require("stream");
const jsonfile = require("jsonfile");
const JSON = require("JSON");
const fs = require("fs");
//import {spawn} from 'child_process';
const uuidv4 = require("uuid/v4");
const path = require("path");
const deepEqual = require("deep-equal");
class Task extends stream.Duplex {
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Initialize the task parameters.
    */
    constructor(jobManager, jobProfile, taskNum, options) {
        super(options);
        if (!jobManager)
            throw 'ERROR : a job manager must be specified';
        this.jobManager = jobManager;
        this.staticTag = 'simple';
        this.cacheDir = this.jobManager.cacheDir();
        this.jobProfile = jobProfile;
        this.streamContent = '';
        this.results = null;
        this.goReading = false;
        this.nextInput = false;
        this.settFile = __dirname + '/data/settings.json';
        this.firstSet(this.__parseJson__(this.settFile));
        if (taskNum)
            this.dynamicTag = this.staticTag + taskNum;
        else
            this.dynamicTag = this.staticTag;
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
            if ('jobsArray' in data)
                this.jobsArray = data.jobsArray;
            else
                this.jobsArray = [];
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
            if ('jobsArray' in data)
                this.jobsArray = data.jobsArray;
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
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Bad method but necessary... to compare two JSON objects
    * In both JSON object, remove the variables that are using the uuid or unique variables.
    * These variables are unique so JSONs cannot be compared if we don't remove them.
    */
    deepSettingsEqual(json1, json2) {
        /* for this task, only json.exportVar.inputFile is unique */
        //console.log(json1, json2);
        if (json1.exportVar.inputFile && json2.exportVar.inputFile) {
            var json1_clone = JSON.parse(JSON.stringify(json1));
            var json2_clone = JSON.parse(JSON.stringify(json2));
            delete json1_clone.exportVar.inputFile;
            delete json2_clone.exportVar.inputFile;
            if (deepEqual(json1_clone, json2_clone, false))
                return true;
            else
                return false;
        }
        else
            return false;
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Check for differences between the settings of this & the settings of current
    * WARNING : settings of this must be in a JSON format contrary to the settings of
    * current that must be a FILE (in JSON format)
    */
    settingsEqual(settings_this, settFile_current) {
        try {
            var settings_current = this.__parseJson__(settFile_current);
            // console.log('okokokok >>>' + settings_this + '<<< //// >>>' + settings_current + '<<<');
            if (this.deepSettingsEqual(settings_this, settings_current))
                return true;
            else
                return false;
        }
        catch (err) {
            console.log('ERROR in settingsEqual() : ' + err);
            return false;
        }
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Check for differences between the input of this & the input of current
    */
    inputEqual(inputFile_this, inputFile_current) {
        var data_this = this.__readFile__(inputFile_this);
        var data_current = this.__readFile__(inputFile_current);
        if (data_this === null || data_current === null)
            return false;
        //console.log('okokokok >>>' + data_this + '<<< //// >>>' + data_current + '<<<');
        if (data_this === data_current)
            return true;
        else
            return false;
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Check for differences between the core script of this & the core script of current
    */
    coreScriptEqual(coreScript_this, coreScript_current) {
        var data_this = this.__readFile__(coreScript_this);
        var data_current = this.__readFile__(coreScript_current);
        if (data_this === null || data_current === null)
            return false;
        //console.log('okokokok >>>' + data + '<<< //// >>>' + d + '<<<');
        if (data_this === data_current)
            return true;
        else
            return false;
    }
    /*
    * DO NOT MODIFY
    * Search for ONE UNIQUE file ("target") among a list of files (filesDir_array)
    * from a "directory". Possible thanks the "regexTarget".
    */
    __searchForOneFile__(directory, filesDir_array, regexTarget) {
        if (!directory) {
            console.log('WARNING in __searchForOneFile__() : no directory specified');
            return null;
        }
        else if (!filesDir_array) {
            console.log('WARNING in __searchForOneFile__() : no filesDir_array specified');
            return null;
        }
        else if (!regexTarget) {
            console.log('WARNING in __searchForOneFile__() : no regexTarget specified');
            return null;
        }
        if (filesDir_array.length == 0)
            return null;
        var fileTarget_array = filesDir_array.filter(function (file) {
            return file.match(regexTarget); // only files that match
        }).map(function (file) {
            return path.join(directory, file);
        });
        // we want only ONE file :
        if (fileTarget_array.length > 1) {
            console.log('WARNING : more than one file found : ' + fileTarget_array);
            return null;
        }
        else if (fileTarget_array.length === 0) {
            console.log('WARNING : no file found in ' + directory + ' corresponding to : ' + regexTarget);
            return null;
        }
        else
            return fileTarget_array[0];
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * Check if this task has already been done,
    * by checking for differences between our actual task ("this") & the finished task (called "current")
    * (using this.settingsEqual(), this.inputEqual() and this.coreScriptEqual() methods).
    * Steps :
    * 	(1) find all task directories which the task is the same type of "this" (according to tagTask)
    * 	(2) browse task directories
    * 	(3) read the content of the task directory and the input directory
    * 	(4) check the existence of the result files (.out and .err)
    * 	(5) check the existence of both parameter files (.json && _coreScript.sh) and input file
    * 	(6) compare all current task files with this task files
    */
    alreadyDone(jobOpt, data) {
        var tab_taskDir = this.jobManager.findTaskDir(this.staticTag); // (1)
        if (tab_taskDir.length === 0)
            return null;
        //console.log(tab_taskDir);
        for (var i = 0; i < tab_taskDir.length; i++) {
            var current_taskDir = tab_taskDir[i];
            var current_inputDir = current_taskDir + '_inputs'; // path of the input directory
            var basename = path.basename(current_taskDir); // basename = tagTask + 'Task_' + uuid
            var re_outFile = basename + '.out';
            var re_errFile = basename + '.err';
            var re_json = basename + '_jobOpt.json';
            var re_coreScript = basename + '_coreScript.sh';
            var re_input = basename + '.txt';
            var current_outFile = null;
            var current_errFile = null;
            var current_jsonFile = null;
            var current_coreScriptFile = null;
            var current_inputFile = null;
            console.log('basename : ' + basename); // toto = simpleTask_98cb27cb-a0cd-40be-9e39-57ee16256a78
            try {
                var files_taskDir = fs.readdirSync(current_taskDir);
            } // read content of the task directory (3)
            catch (err) {
                console.log('WARNING : ' + err);
                if (i === tab_taskDir.length - 1)
                    return null;
                ;
            }
            try {
                var files_inputDir = fs.readdirSync(current_inputDir);
            } // read content of the input directory (3)
            catch (e) {
                console.log('WARNING : ' + e);
                if (i === tab_taskDir.length - 1)
                    return null;
            }
            // check the existence of the .out and .err files before anything else (4)
            current_outFile = this.__searchForOneFile__(current_taskDir, files_taskDir, re_outFile);
            current_errFile = this.__searchForOneFile__(current_taskDir, files_taskDir, re_errFile);
            if (!current_outFile || !current_errFile) {
                if (i === tab_taskDir.length - 1)
                    return null;
            }
            else if (this.__parseJson__(current_outFile) === null) {
                if (i === tab_taskDir.length - 1)
                    return null;
            }
            // search for the json, _coreScript.sh and input files (5)
            current_jsonFile = this.__searchForOneFile__(current_inputDir, files_inputDir, re_json);
            current_coreScriptFile = this.__searchForOneFile__(current_taskDir, files_taskDir, re_coreScript);
            current_inputFile = this.__searchForOneFile__(current_inputDir, files_inputDir, re_input);
            if (current_jsonFile && current_coreScriptFile && current_inputFile) {
                if (this.settingsEqual(jobOpt.specific, current_jsonFile)) {
                    if (this.coreScriptEqual(this.coreScript, current_coreScriptFile)) {
                        if (this.inputEqual(jobOpt.specific.exportVar.inputFile, current_inputFile)) {
                            console.log('FOUND : ' + basename);
                            return current_taskDir;
                        }
                        else {
                            if (i === tab_taskDir.length - 1)
                                return null;
                        }
                    }
                    else {
                        if (i === tab_taskDir.length - 1)
                            return null;
                    }
                }
                else {
                    if (i === tab_taskDir.length - 1)
                        return null;
                }
            }
            else if (i === tab_taskDir.length - 1)
                return null;
        }
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * With a path, restore a session
    */
    restoreByPath(pathDir) {
        if (!pathDir)
            throw 'ERROR : no path specified';
        var basename = path.basename(pathDir);
        var results = this.__readFile__(pathDir + '/' + basename + '.out');
        //console.log(pathDir + '/' + basename + '.out');
        return results;
    }
    /*
    * DO NOT MODIFY
    * Pre-processing of the job.
    * Configure the dictionary to pass to the jobManager.push() function, according to :
    * 	(1) the list of the modules needed
    * 	(2) variables to export in the coreScript
    * 	(3) the profile of our configuration (arwen/arwen-dev, etc.)
    * 	(4) the "mode" (must be "cpu" or "gpu")
    * This dictionary is composed of :
    * 	- a "generic" part = include parameters that will not change the results of the task
    * 	- a "specific" part = for parameters needed to define precisely the task
    */
    __configJob__(modules, exportVar, mode) {
        var jobOpt = {
            'generic': {
                'id': this.staticTag + 'Task_' + uuidv4(null, null, 0),
                'tWall': '0-00:15',
                'nCores': null
            },
            'specific': {
                'script': this.coreScript,
                'modules': [],
                'exportVar': exportVar // (2)
            }
        };
        if (modules.length > 0)
            jobOpt.specific.modules.concat(modules);
        jobOpt.specific.exportVar['inputFile'] = this.cacheDir + '/' + jobOpt.generic.id + '_inputs/' + jobOpt.generic.id + '.txt';
        // according to our configuration (3)
        if (this.jobProfile !== null)
            for (var key in this.jobProfile)
                jobOpt.generic[key] = this.jobProfile[key];
        // parameters depending to the mode (4)
        if (mode === 'gpu') {
            jobOpt.generic.nCores = 1;
            jobOpt.generic['gres'] = 'gpu:1';
        }
        else if (mode === 'cpu') {
            jobOpt.generic.nCores = 1;
        }
        else {
            console.log("WARNING in __configJob__() : mode not recognized. It must be \"cpu\" or \"gpu\" !");
        }
        return jobOpt;
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * to manage the input(s)
    * Use the values in @jsonValue [literal] to configure modules and exportVar for configJob.
    * And prepare the directories and files for the task : JSON (settings) & input(s).
    */
    prepareTask(jsonValue) {
        var modules = [];
        var exportVar = {};
        var jobOpt = this.__configJob__(modules, exportVar, 'cpu');
        // input name(s)
        var name = 'input';
        var inputDir = this.cacheDir + '/' + jobOpt.generic.id + '_inputs/';
        this.__createDir__(inputDir); // create the input directory
        this.__writeJson__(inputDir + '/' + jobOpt.generic.id + '_jobOpt.json', jobOpt.specific); // write the JSON file (settings)
        // write the input file(s) :
        this.__writeFile__(jobOpt.specific.exportVar.inputFile, jsonValue[name]);
        return jobOpt;
    }
    /*
    * MUST BE ADAPTED FOR CHILD CLASSES
    * To manage the output(s)
    */
    prepareResults(chunk) {
        if (typeof chunk !== 'string')
            chunk = JSON.stringify(chunk);
        var results = {
            'input': chunk
        };
        return JSON.stringify(results);
    }
    /*
    * DO NOT MODIFY
    * Execute all the calculations
    */
    __run__(jobOpt) {
        var emitter = new events.EventEmitter();
        var j = this.jobManager.push(jobOpt);
        j.on('completed', (stdout, stderr, jobObject) => {
            if (stderr) {
                stderr.on('data', buf => {
                    console.log('stderr content : ');
                    console.log(buf.toString());
                });
            }
            var chunk = '';
            stdout.on('data', buf => { chunk += buf.toString(); });
            stdout.on('end', () => {
                this.__async__(this.prepareResults(chunk)).on('end', results => {
                    emitter.emit('jobCompletion', results, jobObject);
                });
            });
        })
            .on('error', (e, j) => {
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
    __stringToJson__(toParse) {
        var open = '{', close = '}';
        var jsonStart = -1, jsonEnd = -1;
        var counter = 0;
        var sub_toParse;
        var result = {
            "rest": "",
            "jsonTab": []
        };
        /*
        * Check the existence of a JSON in a string.
        * Method : search the indice of the first { in the string. Then search a } from the indice to the end of the string.
        */
        var __jsonAvailable__ = function (toParse) {
            var open = '{', close = '}';
            // search the first '{'
            var first_open = toParse.search(open);
            if (first_open === -1)
                return false;
            // search a '}' from the first '{' to the end
            var next_close = toParse.substring(first_open).search(close);
            if (next_close === -1)
                return false;
            else
                return true;
        };
        while (__jsonAvailable__(toParse)) {
            for (var i = 0; i < toParse.length; i++) {
                //console.log(i, toParse[i]);
                if (toParse[i].match(open)) {
                    if (counter === 0)
                        jsonStart = i; // if a JSON is beginning
                    counter++;
                }
                // looking for a } only if a { was found before
                if (toParse[i].match(close) && jsonStart !== -1) {
                    counter--;
                    if (counter === 0) {
                        jsonEnd = i;
                        // prepare the JSON object
                        sub_toParse = toParse.substring(jsonStart, jsonEnd + 1);
                        result.jsonTab.push(JSON.parse(sub_toParse));
                        toParse = toParse.replace(sub_toParse, ''); // remove the part of the JSON already parsed
                        jsonStart = -1, jsonEnd = -1;
                    }
                }
            }
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
    * 		(4) check if a previous task was already done :
    * 			(5) if yes -> restore
    * 			(6) if no -> run
    */
    __processing__(chunk) {
        if (!chunk)
            throw 'ERROR : Chunk is ' + chunk; // if null or undefined
        var emitter = new events.EventEmitter();
        this.streamContent += chunk; // (1)
        console.log('streamContent :');
        console.log(this.streamContent);
        var resJsonParser = this.__stringToJson__(this.streamContent); // (1)
        this.streamContent = resJsonParser.rest;
        var jsonTab = resJsonParser.jsonTab;
        console.log('jsonTab :');
        console.dir(jsonTab);
        jsonTab.forEach((jsonValue, i, array) => {
            //console.log('######> i = ' + i + '<#>' + jsonValue + '<######');
            if (jsonValue === 'null' || jsonValue === 'null\n') {
                this.pushClosing();
            }
            else {
                var taskOpt = this.prepareTask(jsonValue); // (3)
                //console.log(taskOpt);
                var pathRestore = this.alreadyDone(taskOpt, jsonValue.input); // (4)
                if (pathRestore !== null) {
                    console.log('Restoration process started with the path : ' + pathRestore);
                    this.__async__(this.restoreByPath(pathRestore)).on('end', results => {
                        this.goReading = true;
                        this.push(results);
                        emitter.emit('restored', results);
                    });
                }
                else {
                    console.log('No equal task found in previous cache directories : go running !');
                    this.__run__(taskOpt)
                        .on('jobCompletion', (results, jobObject) => {
                        this.goReading = true;
                        this.push(results); // pushing string = activate the "_read" method
                        emitter.emit('processed', results);
                    })
                        .on('error', err => {
                        emitter.emit('err');
                    });
                }
            }
        });
        return emitter;
    }
    /*
    * DO NOT MODIFY
    * Necessary to use .pipe(task)
    */
    _write(chunk, encoding, callback) {
        // chunk can be either string or buffer but we need a string
        if (Buffer.isBuffer(chunk))
            chunk = chunk.toString();
        //console.log('>>>>> write');
        this.__processing__(chunk)
            .on('processed', s => {
            this.emit('processed', s);
        })
            .on('err', s => {
            this.emit('err', s);
        })
            .on('restored', s => {
            this.emit('restored', s);
        });
        callback();
        return this;
    }
    /*
    * DO NOT MODIFY
    * Necessary to use task.pipe()
    */
    _read(size) {
        //console.log('>>>>> read');
        if (this.goReading) {
            //console.log('>>>>> read: this.goReading is F');
            this.goReading = false;
        }
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
        this.jobManager.stop(managerSettings, this.dynamicTag)
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
        //console.log(emitter);
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
}
exports.Task = Task;
