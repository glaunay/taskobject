# Taskobject

## What is a Task ?

We have implemented the Task class in order to :
1. construct scientific pipelines,
2. manage data for scientific calculations,
3. and submit scientific jobs to a JM (= Job Manager, more info in the [More](#more) section).  

### Construct pipelines
A Task is a class inherited from the Readable Stream class. Thus, it can contain data and do stuff with it. It can also use the method `pipe` like : `mytask.pipe(writableStream)` and transfer its data to a writable Stream. The output data is always in JSON format.  

A Task contains Slots. These are objects inherited from the Writable Stream class. Thus, we can push data on them like : `readableStream.pipe(mytask.myslot)`. Each input needed to run a Task calculation is associated to one unique Slot (so each Slot is created to receive only one unique input). The input data must be pushed in a JSON format.  

With these elements, we can easily construct a pipeline :
```
task_a.pipe(task_c.slot_1)
task_b.pipe(task_c.slot_2)

task_c.pipe(task_d.slot_1)
```
Here `task_c` contains two Slots : `slot_1` and `slot_2`. The `slot_1` takes data from `task_a`, and the `slot_2` takes data from `task_b`. Then, `task_c` push its results into the `slot_1` of `task_d`.




Coming soon .....
- a Task is dependant to a JM to run the calculations
- a Task always provide a bash script that will be passed to the JM (with the inputs and the settings) to run the job. It is the core of the job.  






## Installation

In your project repository :

```
npm install taskobject
```


## Usage : tests

This module can be used only with the test modes. In fact, the taskobject is an abstract class created as a base to implement bioinformatic tasks, using inheritance.  
Two test modes are available. Each one is based on a child class of the taskobject :
- the simple test : uses the simpleTask (more info in the [More](#more) section)
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
>1. creates a stream (Readable) containing a JSON with your `inputFile` content,
>2. instantiates a simpleTask (more info in the [More](#more) section),
>3. pipes the stream on the simpleTask.input slot,
>4. pipes the simpleTask object on `process.stdout`, so you can watch the results in your console.  

>The `dualTest` method :
>1. creates two streams (Readable) each one containing a JSON with your `inputFileX` content (X = 1 or 2),
>2. instantiates a dualTask (more info in the [More](#more) section),
>3. pipes the stream of inputFile1 on the simpleTask.input1 slot,
>4. pipes the stream of inputFile2 on the simpleTask.input2 slot,
>5. pipes the dualTask object on `process.stdout`, so you can watch the results in your console.  


### The test file

The previous test is already implemented in the `./node_modules/taskobject/test/` directory. To use it :

```
node ./node_modules/taskobject/test.js
```

This script needs some command line options. You can use option `-u` to display the documentation.



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

#### Inherit from Task

In the constructor of your child class :
1. call the parent class constructor : `super(management, options)`
2. take the current directory of your child class : `this.rootdir = __dirname`
3. construct the path to the setting file of your child class : `this.settFile = this.rootdir + '/../data/settings.json';`
4. define a tag to your child class : `this.staticTag = 'myChildClass'`
5. define all the input you need to run the calculations of your child class, by creating a symbol for each input in the `slotSymbols` array : `this.slotSymbols = ['myInput']`
6. end with the call to the init method : `super.init(this.settFile)`


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
