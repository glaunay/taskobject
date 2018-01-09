# Taskobject

----------

Taskobject is an instance of stream, in order to define bioinformatic tasks.

----------

## What is a Task ?

Coming soon...

- instance of Streams (Duplex)
- Needs a JM
- Feeds on JSON and returns JSON
- run a bash script


----------

## Installation

In your project repository :
```
npm install taskobject
```


----------
## Usage

### A simple test

In your JS script, import the test file :
```
var tkTest = require('./node_modules/taskobject/test/test');
```

Then you have to start and set up a JM (= Job Manager, more info in the [More about...](#more-about) section). We provide a method that takes care of that :
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
2. instantiates a simpleTask (more info in the [More about...](#more-about) section),
3. pipes the stream on the simpleTask, also piped on `process.stdout`, so you can watch the results in your console.



### Loading library

In your JavaScript module :
```
var tk = require('taskObject');
```

### Creating a task object - not updated

In your JavaScript module :
```
var taskTest = new tk.Task (jobManager, jobProfile);
```
Note that you need a job manager to use taskObject, like **nslurm**  ([GitHub repo][1], [NPM package][2]) adapted to SLURM manager.


### Using in a pipeline - not updated

In your JavaScript module :
```
readableStream
.pipe(taskTest)
.pipe(writableStream);
```

### Setting the task - not updated

You can modify the parameters in the **./data/settings.json** file :

```
{
	"coreScript": "./data/simple.sh",
	"jobsArray" : [],
	"wait" : true,
	"automaticClosure": false,
	// proper task parameters :
	"settings": {}
}
```
Proper task parameters must be defined in the "settings" part of the JSON.

### Testing the task with stdin - not updated

On a server using the SLURM manager, in your terminal :
```
$ node ./test/test.js -forcecache ./tmp/forceCache/
```
Then you can write a JSON containing a key "input", like :
```
{"input" : "hello world"}
```



----------
## Task developer

### Installation

In your main directory :
```
git clone https://github.com/melaniegarnier/taskobject.git
cd ./taskobject/
npm install
```

### Test

In the `./taskobject/` directory :
```
node ./test/test.js -h
```
will provide you the help you need to run the test.

oYu can use for example :
```
node ./test/test.js
	-cache /your/cache/directory/
	-conf ./node_modules/nslurm/config/arwenConf.json // for the Arwen cluster
	-file ./test/test.txt // a simple text file
```
This use the simpleTask created as a task example. A simpleTask 

### Development of your proper task

Coming soon...


----------
## More about...

### Job Manager

Coming soon...
A Job Manager (JM) is necessary to run a Task. In our case, we use the nslurm package ([GitHub repo][1], [NPM package][2]), adapted for SLURM.

### SimpleTask

Coming soon...
The simpleTask has been implemented only for the tests. It :

1. takes a JSON as entry,
2. splits the JSON line by line,
3. creates a new JSON : each key is a line number and the value is the corresponding line content,
4. returns this new JSON.




  [1]: https://github.com/glaunay/nslurm
  [2]: https://www.npmjs.com/package/nslurm