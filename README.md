# Taskobject

## Why ?

We have implemented the Task class in order to :
1. construct scientific pipelines,
2. manage data for scientific calculations (inputs and outputs),
3. submit scientific jobs to a JM (= Job Manager, more info in the [Job Manager](#job-manager) section).  

### What is a Task ?
A Task is a class inherited from the Readable Stream class. Thus, it can contain data and do stuff with it. It can also use the method `pipe` like : `mytask.pipe(writableStream)` and transfer its data to a writable Stream. The output data is always in JSON format.  

### What are Slots ?
A Task contains Slots (`mytask.myslot`). These are objects inherited from the Writable Stream class. Thus, we can push data on them like : `readableStream.pipe(mytask.myslot)`. Each input needed to run a Task calculation is associated to one unique Slot (so each Slot is created to receive only one unique input). As a consequence, a Task must have at least one Slot. The input data must be pushed in a JSON format.  

### Construct pipelines
Regarding the two previous parts, we can easily construct a pipeline :
```javascript
task_a.pipe(task_c.slot_1) // a -> c.1
task_b.pipe(task_c.slot_2) // b -> c.2

task_c.pipe(task_d.slot_1) // c -> d.1
task_d.pipe(task_e.slot_1) // d -> e.1
```
Here `task_c` contains two Slots : `slot_1` and `slot_2`. The `slot_1` takes data from `task_a`, and the `slot_2` takes data from `task_b`. Then, `task_c` push its results into the `slot_1` of `task_d`. Finally, results of `task_d` are pushed into the `slot_1` of `task_e`.
>Note that even if the `task_d` has only one input, it is pushed on a Slot and not on the Task itself (same for `task_e`).

### Remarks about Tasks
- for the constistency of the pipeline, data exchanged between Tasks and Slots are in JSON format.
- a Task depends on a JM to run the calculations.
- a Task always provide a bash script (named CoreScript) that will be passed to the JM (with the inputs and the settings) to run the job. It is the core of the job.  


## Installation

In your project repository :

```sh
npm install taskobject
```


## Usage : tests

This module can be used only with the test modes. In fact, the taskobject is an abstract class created as a base to implement bioinformatic tasks, using inheritance.  
Two test modes are available. Each one is based on a child class of the taskobject :
- the simple test : uses the simpletask (more info in the [SimpleTask](#simpletask) section)
- the dual test : uses the dualtask (more info in the [DualTask](#dualtask) section)   
You can either make a test in your proper JS file or use one of the test files we provide.


### Your proper test

In your JS script, import the test file :

```javascript
var tkTest = require('./node_modules/taskobject/test/test');
```

Then you have to start and set up a JM. We provide a method that takes care of that :

```javascript
tkTest.JMsetup();
```

`JMsetup` returns an object instance of EventEmitter. It emits `"ready"` when the JM is ready to receive jobs, and provide the JM object.
Then, you can run the `simpleTest` method (or the `dualTest` method) :

```javascript
tkTest.JMsetup().on('ready', function (JMobject) {
	tkTest.simpleTest(inputFile, management);
	tkTest.dualTest(inputFile1, inputFile2, management);
});
```

- `inputFile` are absolute path to your input file(s). No specific format needed.
- `management` is a literal like :

```javascript
let management = {
	'jobManager' : JMobject // provided by the JMsetup method
}
```

>The `simpleTest` method :
>1. instantiates a simpletask (more info in the [SimpleTask](#simpletask) section),
>2. creates a stream (Readable) with your `inputFile` content (in a JSON),
>3. pipes the stream on the `simpleTask.input` slot,
>4. pipes the simpletask object on `process.stdout`, so you can watch the results in your console.  

>The `dualTest` method :
>1. instantiates a dualtask (more info in the [DualTask](#dualtask) section),
>2. creates two streams (Readable) each one containing a JSON with an input content (`inputFile1` and `inputFile2`),
>3. pipes the stream of `inputFile1` on the `simpleTask.input1` slot,
>4. pipes the stream of `inputFile2` on the `simpleTask.input2` slot,
>5. pipes the dualtask object on `process.stdout`, so you can watch the results in your console.  


### The test file

The previous tests are already implemented in the `./node_modules/taskobject/test/` directory. To use it :

```sh
node ./node_modules/taskobject/test.js
```

This script needs some command line options. You can use option `-h` to display the help.



## Task developer

To read before beginning :
- The development of a Task should be done in TypeScript. Here the examples are in TS, and are all related to each other.
- Each task class must be developp as a unique NPM package.
- The name of your class must be **exactly** the same as the name of your NPM package. You cannot choose a name with special characters or capital letters.  
- A Task object must be used for only one job. Each Task instance is meant to run once and can't be reused.  

### Project initialization

In your project directory :

```sh
tsc --init # initialize a TS project (tsconfig.json)
npm init # say yes to all
npm install --save taskobject # we need the taskobject package
npm install --save-dev @types/node # in TS you need node types
```

### Directory tree
Your directories must be organized like the following directory tree :

```sh
.
├── data
│   └── myCoreScript.sh
├── index.js
├── node_modules
│   ├── @types
│   │   └── node
│   └── taskobject
├── package.json
├── test
│   └── test.js
├── ts
│   └── src
│       ├── index.ts
│       ├── test
│       │   └── test.ts
│       └── types
│           └── index.ts
├── tsconfig.json
└── types
    └── index.js
```

### The tsconfig

```
{
    "compilerOptions": {
        "allowJs" : true,
        "baseUrl": ".",
        "lib": [ "dom", "es7" ],
        "listEmittedFiles" : true,
        "listFiles" : false,
        "maxNodeModuleJsDepth" : 10,
        "module": "commonjs",
        "moduleResolution" : "node",
        "outDir" : "./",
        "paths": {
            "*": [ "node_modules/" ]
        },
        "preserveConstEnums" : true,
        "removeComments" : false,
        "target": "ES6"
    },
    "files": [ // path to the files to compile
        "./ts/src/index.ts",
        "./ts/src/test/test.ts"
	]
}

```

### The core script
Every Task must have a bash script which runs the calculations. We named it the core script.  

In your core script, you can access to :
1. the inputs you defined thanks to the Slots (in the `slotSymbols` array, see [The constructor](#the-constructor) part),
2. the modules you gave to the `options` literal (see [Options Literal](#options-literal) part),
3. the variables you gave to the `options` literal (see [Options Literal](#options-literal) part).

**Warning** : the standard output of the core script must be **only** JSON containing the results. Otherwise, your Task will crash.  

Example :
```sh
# Take the content of myInputA :
contentInputA=`cat $myinputA` # (1)

# Run myModule1 with myInputB as a parameter :
myModule1 $myInputB > /dev/null # (2)

# Run myModule2 with the options : ' -ncpu 16 -file /path/toto.txt ' :
myModule2 $myVar_module2 > /dev/null # (3)

# Create the JSON as output :
echo "{ \"pathOfCurrentDir\" : \""
echo $(pwd) # the path of the current directory
echo "\" }"
```

> **Remark** : the key used in the stdout JSON is important during the implementation of the method `"prepareResults"` (see the [The methods to implement](#the-methods-to-implement) section).

### The task class

In the current directory (see the [Directory tree](#directory-tree) section), yous have to create a JavaScript file named index.js, where you will create your task class.

>**Remark** : do not forget to export your class !

#### Inheritence

Your class must inherit from the taskobject (in TS you have to declare all the slots before writing the constructor) :

```typescript
import tk = require('taskobject');
declare var __dirname; // mandatory

class my_custom_task extends tk.Task {
	public readonly myInputA;
	public readonly myInputB;
}
```


#### The constructor
1. call the parent class constructor,
2. take the current directory of your Task class,
3. construct the path to the bash script of your Task with `this.rootdir`,
4. define the Slot names of your Task, one for each input (in the `slotSymbols` array),
5. initialize the Slots.   

Example :
```typescript
constructor(management, options) {
	super(management, options); // (1)
	this.rootdir = __dirname; // (2)
	this.coreScript = this.rootdir + '/data/myCoreScript.sh'; // (3)
	this.slotSymbols = ['myInputA', 'myInputB']; // (4)
	super.initSlots(); // (5)
}
```

>**Note** : `management` (see the [Management Literal](#management-literal) part) and `options` (see the [Options Literal](#options-literal) part) are literals.

#### The methods to implement
You have to override two methods :

```typescript
prepareJob (inputs) {
	return super.configJob(inputs);
}

/* REMARK : 'pathOfCurrentDir' is the key you gave in your core script as JSON output */
prepareResults (chunkJson) {
	return {
		[this.outKey] : chunkJson.pathOfCurrentDir 
	}
}
```

These examples can be simply copied-pasted as it for your usage **but** you have to change the `"pathOfCurrentDir"`. You must replace it by the key used in the stdout JSON of your core script (see the example in [The core script](#the-core-script) part).

### Test your task

In a directory named `./test/` (see the [Directory tree](#directory-tree) section), you have to create a JavaScript file to test your task :

```typescript
import customTask = require('../index')

let aTaskInstance = new customTask.my_custom_task(myManagement, myOptions);
```

#### Management Literal
The `management` literal can contain 2 keys :
- `jobManager` (module) : an instance of a JM (see the [Job Manager](#job-manager) section) [mandatory].
- `jobProfile` (string) : the profile to run the job [optional]. This profile will be passed to the JM and will define the running settings for the job (nodes, queues, users, groups, etc.).   

Example :
```typescript
let myManagement = {
	'jobManager' : JMobject,
	'jobProfile' : 'default'
}
```


#### Options Literal
The `options` literal can contain 3 keys :
- `logLevel` (`string`) : specify a verbose level [optional]. Choose between `debug`, `info`, `success`, `warning`, `error` and `critical`.
- `modules` (`[string]`) : an array of modules to load before the run of the core script [optional].
- `exportVar` (`literal`) : a dictionary of the variable to export before the run of the core script [optional]. Each key is the name of the variable and each value is its content.  

Example :
```typescript
let myOptions = {
	'logLevel': 'debug',
    'modules' : ['myModule1', 'myModule2'],
    'exportVar' : { 'myVar1' : '/an/awesome/path/to/a/file.exe',
    				'myVar_module2' : ' -ncpu 16 -file /path/toto.txt ' }
};
``` 

#### Push an input

Still in your test file, create a Readable Stream with your input (in JSON format), an pipe it on the task instance :

```typescript
let aFirstInput = 'hello world';
let rs = new stream.Readable();
rs.push('{ "' + myInputA + '" : "' + aFirstInput + '" }'); // JSON format
rs.push(null);

rs.pipe(aTaskInstance.myInputA);
```

**Warning** : the key in the JSON **must** be the name of the Slot you push your data on.

#### Task events

Your task can emit events since it is a Readable Stream. When you listen these following events, the callback give you some arguments :
- `processed` : when the task is successfully finished ; [arguments] : the results in JSON format.
- `err` : when an error occured with the task or the JM ; [arguments] : the error.
- `stderrContent` : when an error occured with the coreScript ; [arguments] : the error.
- `lostJob` : when the JM has lost the job ; [arguments] : the message and the job id.   

As example :

```typescript
aTaskInstance.on('processed', res => {
	console.log("I have my results :");
	console.log(res);
})
```

## More

### Job Manager
 
A Job Manager (JM) is a MicroService necessary to run a Task. In our case, we use the ms-jobmanager package ([GitHub repo][1]), adapted for SLURM, SGE and your proper machine.

### Simpletask

The simpletask has been implemented only for the tests. It contains only one slot (`input`) :

1. `simpletask.input` takes a JSON containing an "input" key (via a pipe, like `x.pipe(simpleTask)`).
2. the simpletask reverses the text of the value corresponding to the "input" key.
3. the simpletask creates a new JSON with a "reverse" key, the value being the reversed text.
4. the simpletask pushes this new JSON on its Readable interface. Then we can use a pipe on it, like `simpleTask.pipe(y)`.

### Dualtask

The dualtask has been implemented only to test the task with two slots (`input1` and `input2`) :

1. `dualtask.input1` takes a JSON containing an "input1" key (via a pipe, like `x.pipe(dualtask.input1)`). Same for "input2" (`y.pipe(dualtask.input2)`).
2. the dualtask concatenates the content of input1 with the content of input2.
3. the dualtask creates a new JSON with a "concatenated" key, the value being the concatenated text.
4. the dualtask pushes this new JSON on the Readable interface of the dualtask. Then we can use a pipe on it, like `dualtask.pipe(z.slot)`.


[1]: https://github.com/melaniegarnier/ms-jobmanager
