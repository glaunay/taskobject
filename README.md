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
```
task_a.pipe(task_c.slot_1) // a -> c.1
task_b.pipe(task_c.slot_2) // b -> c.2

task_c.pipe(task_d.slot_1) // c -> d.1
task_d.pipe(task_e.slot_1) // d -> e.1
```
Here `task_c` contains two Slots : `slot_1` and `slot_2`. The `slot_1` takes data from `task_a`, and the `slot_2` takes data from `task_b`. Then, `task_c` push its results into the `slot_1` of `task_d`. Finally, results of `task_d` are pushed into the `slot_1` of `task_e`.
>Note that even if the `task_d` has only one input, it is pushed on a Slot and not on the Task itself (same for `task_e`).

### Remarks about Tasks
- for the constistence of the pipeline, data exchanged between Tasks and Slots are in JSON format.
- a Task is dependant to a JM to run the calculations.
- a Task always provide a bash script (named CoreScript) that will be passed to the JM (with the inputs and the settings) to run the job. It is the core of the job.  


## Installation

In your project repository :

```
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

```
var tkTest = require('./node_modules/taskobject/test/test');
```

Then you have to start and set up a JM. We provide a method that takes care of that :

```
tkTest.JMsetup();
```

`JMsetup` returns an object instance of EventEmitter. It emits `"ready"` when the JM is ready to receive jobs, and provide the JM object.
Then, you can run the `simpleTest` method (or the `dualTest` method) :

```
tkTest.JMsetup().on('ready', function (JMobject) {
	tkTest.simpleTest(inputFile, management);
	tkTest.dualTest(inputFile1, inputFile2, management);
});
```

- `inputFile` are absolute path to your input file(s). No specific format needed.
- `management` is a literal like :

```
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

```
node ./node_modules/taskobject/test.js
```

This script needs some command line options. You can use option `-h` to display the help.



## Task developer

Each task class must be developp as a unique NPM package. The name of your class must be exactly the same as the name of your NPM package, and exactly the same as your `staticTag` (see the [The constructor](#the-constructor) part).  
A Task object must be used for only one job. Create a new instance of a a Task by job to run.  
In our team we use TypeScript to develop but here the examples are in JavaScript. All the examples in this part are related.  

### Inheritence
Your class must inherit from the taskobject :
```
var tk = require('taskobject');
class my_custom_task extends tk.Task {}
```

> **Note** : in TypeScript you have to declare all the slots before writing the constructor :
```
class my_custom_task extends tk.Task {
	public readonly myInputA;
	public readonly myInputB;
}
```


### The constructor
1. call the parent class constructor,
2. take the current directory of your Task class,
3. construct the path to the bash script of your Task with `this.rootdir`,
4. define a unique tag to your child class (**same name of your task class**),
5. define the Slot names of your Task, one for each input (in the `slotSymbols` array),
6. initialize the Slots.   

Example :
```
constructor(management, options) {
	super(management, options); // (1)
	this.rootdir = __dirname; // (2)
	this.coreScript = this.rootdir + '/data/myCoreScript.sh'; // (3)
	this.staticTag = 'my_custom_task'; // (4)
	this.slotSymbols = ['myInputA', 'myInputB']; // (5)
	super.initSlots(); // (6)
}
```

>**Note** : `management` (see the [Management Literal](#management-literal) part) and `options` (see the [Options Literal](#options-literal) part) are literals.

### Management Literal
The `management` literal can contain 2 keys :
- `jobManager` (object) : an instance of a JM (see the [Job Manager](#job-manager) section) [mandatory].
- `jobProfile` (string) : the profile to run the job [optional]. This profile will be passed to the JM and will define the running settings for the job (nodes, queues, users, groups, etc.).   

Example :
```
let myManagement = {
	'jobManager' : JMobject,
	'jobProfile' : 'default'
}
```


### Options Literal
The `options` literal can contain 3 keys :
- `logLevel` (`string`) : specify a verbose level [optional]. Choose between `debug`, `info`, `success`, `warning`, `error` and `critical`.
- `modules` (`[string]`) : an array of modules to load before the run of the core script [optional].
- `exportVar` (`literal`) : a dictionary of the variable to export before the run of the core script [optional]. Each key is the name of the variable and each value is its content.  

Example :
```
let myOptions = {
	'logLevel': 'debug',
    'modules' : ['myModule1', 'myModule2'],
    'exportVar' : { 'myVar1' : '/an/awesome/path/to/a/file.exe',
    				'myVar_module2' : ' -ncpu 16 -file /path/toto.txt ' }
};
``` 


### The CoreScript
Every Task must have a bash script which runs the calculations. We named it the core script.  

In your core script, you can access to :
1. the inputs you defined thanks to the Slots (in the `slotSymbols` array, see [The constructor](#the-constructor) part),
2. the modules you gave to the `options` literal (see [Options Literal](#options-literal) part),
3. the variables you gave to the `options` literal (see [Options Literal](#options-literal) part).

**Warning** : the core script you create must make `echo` only to contruct a JSON containing the results. Otherwise, your Task will crash.  

Example :
```
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

## More

### Job Manager

Coming soon...  
A Job Manager (JM) is necessary to run a Task. In our case, we use the nslurm package ([GitHub repo][1], [NPM package][2]), adapted for SLURM.

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


[1]: https://github.com/glaunay/nslurm
[2]: https://www.npmjs.com/package/nslurm
