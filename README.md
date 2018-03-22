# Taskobject

## Why ?

We have implemented the Task class in order to :
1. construct scientific pipelines,
2. manage data for scientific calculations (inputs and outputs),
3. submit scientific jobs to a JM (= Job Manager, more info in the [More](#more) section).  

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
- the simple test : uses the simpletask (more info in the [More](#more) section)
- the dual test : uses the dualtask (more info in the [More](#more) section)
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
>1. instantiates a simpletask (more info in the [More](#more) section),
>2. creates a stream (Readable) with your `inputFile` content (in a JSON),
>3. pipes the stream on the `simpleTask.input` slot,
>4. pipes the simpletask object on `process.stdout`, so you can watch the results in your console.  

>The `dualTest` method :
>1. instantiates a dualtask (more info in the [More](#more) section),
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

### Installation

In your main directory :

```
git clone https://github.com/melaniegarnier/taskobject.git
cd ./taskobject/
npm install
```


### Development of your proper task

Coming soon...

In our team we use TypeScript to develop but here the examples are in JavaScript.

#### Inheritence
Your class must inherit from the taskobject :
```
var tk = require('taskobject');
class MyCustomTask extends tk.Task {}
```

#### The constructor
1. call the parent class constructor,
2. take the current directory of your Task class,
3. construct the path to the setting file of your Task with `this.rootdir`,
4. define a unique tag to your child class,
5. define the Slot names of your Task, one for each input (in the `slotSymbols` array),
6. call the init method to sett your Task.   

Example :
```
constructor(management, options) {
	super(management, options); // (1)
	this.rootdir = __dirname; // (2)
	this.settFile = this.rootdir + '/../data/settings.json'; // (3)
	this.staticTag = 'my_custom_task'; // (4)
	this.slotSymbols = ['myinputA', 'myinputB']; // (5)
	super.init(this.settFile); // (6)
}
```

#### The settings.json file

Coming soon...

Must contain :

```
{
	"coreScript" : "/../data/simple.sh",
	"settings" : {}
}
```


#### The CoreScript
Coming soon...

Every Task must have a bash script which run the calculations. It can be a Blast or anything else.

Talks about the Slot names here !!!!!!!!!!!!!!!!!!!!!
(the symbol of a Slot is usable in the CoreScript)

## More

### Job Manager

Coming soon...  
A Job Manager (JM) is necessary to run a Task. In our case, we use the nslurm package ([GitHub repo][1], [NPM package][2]), adapted for SLURM.

### SimpleTask

Coming soon...  
The simpleTask has been implemented only for the tests. It :

1. takes a JSON containing an "input" key as entry on its Writable interface (via a pipe, like `x.pipe(simpleTask)`),
2. reverses the text of the value corresponding to the "input" key,
3. creates a new JSON with a "reverse" key, the value being the reversed text,
4. push this new JSON on its Readable interface. Then we can use a pipe on it, like `simpleTask.pipe(y)`.

### DualTask

Coming soon...  


[1]: https://github.com/glaunay/nslurm
[2]: https://www.npmjs.com/package/nslurm
