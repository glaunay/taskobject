# Taskobject

Taskobject is an instance of stream, in order to define bioinformatic tasks.


## What is a Task ?

Coming soon...

- instance of Streams (Duplex)
- Needs a JM
- Feeds on JSON and returns JSON
- run a bash script


## Installation

In your project repository :

```
npm install taskobject
```


## Usage : tests

This module can be used only in the test mode. In fact, the taskobject is an abstract class created as a base to implement bioinformatic tasks using inheritance.  
The test mode uses a child class of taskobject : the simpleTask (more info in the [More](#more) section).  
You can either make a test in your proper JS file or use the test file we provide.


### Your proper test

In your JS script, import the test file :

```
var tkTest = require('./node_modules/taskobject/test/test');
```

Then you have to start and set up a JM (= Job Manager, more info in the [More](#more) section). We provide a method that takes care of that :

```
tkTest.JMsetup();
```

`JMsetup` returns an object instance of EventEmitter. It emits `"ready"` when the JM is ready to receive jobs, and provide the JM object.
Then, you can run the `simpleTest` method :

```
tkTest.JMsetup().on('ready', function (JMobject) {
	tkTest.simpleTest(inputFile, management);
});
```

- `inputFile` is the absolute path to your input file. For the file, no specific format needed.
- `management` is a literal like :

```
let management = {
	'jobManager' : JMobject // provided by the JMsetup method
}
```

The `simpleTest` method :

1. creates a stream (Readable) containing a JSON with your `inputFile` content,
2. instantiates a simpleTask (more info in the [More](#more) section),
3. pipes the stream on the simpleTask, also piped on `process.stdout`, so you can watch the results in your console.


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




[1]: https://github.com/glaunay/nslurm
[2]: https://www.npmjs.com/package/nslurm