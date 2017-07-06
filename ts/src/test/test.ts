/// <reference path="../../typings/index.d.ts" />

import tk = require ('../index');
import jsonfile = require ('jsonfile');
import nslurm = require ('nslurm');
import path = require ('path');
import localIP = require ('my-local-ip');

var local_IP = localIP();
var cache, forceCache;


process.argv.forEach(function (val, index, array){
    if (val === '-forcecache'){
        if (! array[index + 1]) throw("usage : ");
        forceCache = array[index + 1];
    }
    if (val === '-cache'){
        if (! array[index + 1]) throw("usage : ");
        cache = array[index + 1];
    }
});


// manager settings creation
if (! cache && ! forceCache) throw 'No cache or forcecache directory specified !';
if (! cache) cache = '';

var managerSettings = {
    "cacheDir": cache,
    "probPreviousCacheDir": [],
    "tcp": local_IP,
    "port": "2220",
    "slurmBinaries": "/opt/slurm/bin/",
    "jobProfiles": {
        "arwen_gpu": {
            "partition": "gpu_dp",
            "qos": "gpu"
        },
        "arwen_cpu": {
            "partition": "mpi-mobi",
            "qos": "mpi-mobi"
        },
        "arwen-dev_gpu": {
            "partition": "gpu",
            "qos": "gpu",
            "gid": "ws_users",
            "uid": "ws_ardock"
        },
        "arwen-dev_cpu": {
            "partition": "ws_dev",
            "qos": "ws_dev",
            "gid": "ws_users",
            "uid": "ws_ardock"
        }
    }
}
if (forceCache) managerSettings['forceCache'] = forceCache
console.log(managerSettings)


// jobmanager
nslurm.start(managerSettings);
var jobProfile = nslurm.selectJobProfile("arwen_cpu");

var a = new tk.Task (nslurm, jobProfile);
//var b = new tk.Task (nslurm, jobProfile); // for reading tests


// pipeline
process.stdin.pipe(a)
.on('processed', s => {
	console.log('**** data');
})
.on('err', s => {
	console.log('**** ERROR');
})
.on('restored', function (s) {
	console.log('**** restored :-)');
})
// .pipe(b)
// .on('processed', s => {
//     console.log('**** data 22222');
// })
// .on('err', s => {
//     console.log('**** ERROR 22222');
// })
// .on('restored', function (s) {
//     console.log('**** restored :-) 22222');
// })
.pipe(process.stdout);



// {"input" : "toto"}
// var test = "{\"input\" : \"hello";
// var test2 = " world\"}";
// a.goReading = true;
// a.push(test)

// setTimeout(() => {
//     a.goReading = true;
//     a.push(test2)
// }, 15000);



