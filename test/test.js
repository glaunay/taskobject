/// <reference path="../../typings/index.d.ts" />
"use strict";
const tk = require("../index");
const jobManager = require("nslurm"); // engineLayer branch of course
const localIP = require("my-local-ip");
var tcp = localIP(), port = "2220";
var iJob = null;
var engineType, cacheDir;
var jobOpt = {};
var optCacheDir = [];
process.argv.forEach(function (val, index, array) {
    if (val === '-cache') {
        if (!array[index + 1])
            throw ("usage : ");
        cacheDir = array[index + 1];
    }
});
if (!cacheDir)
    throw 'No cacheDir specified !'; // /home/mgarnier/tmp
var bean = {
    "engineType": "slurm",
    "cacheDir": cacheDir,
    "probPreviousCacheDir": [
        "/home/mgarnier/taskObject_devTests/tmp/forceCache/",
        "/home/mgarnier/tmp"
    ],
    "binaries": {
        "cancelBin": "/opt/slurm/bin/scancel",
        "submitBin": "/opt/slurm/bin/sbatch",
        "queueBin": "/opt/slurm/bin/squeue"
    }
};
engineType = engineType ? engineType : bean.engineType;
optCacheDir.push(bean.cacheDir);
///////////// jobManager /////////////
jobManager.index(optCacheDir);
jobManager.configure({ "engine": engineType, "binaries": bean.binaries });
jobManager.start({
    'cacheDir': bean.cacheDir,
    'tcp': tcp,
    'port': port
});
jobManager.on('exhausted', function () {
    console.log("All jobs processed");
});
jobManager.on('ready', function () {
    testTask(jobOpt, iJob);
});
//////////// tests /////////////
var testTask = function (jobOpt, iJob) {
    var jobProfile = null;
    var a = new tk.Task(jobManager, jobProfile);
    //var b = new tk.Task (nslurm, jobProfile); // for reading tests
    // pipeline
    process.stdin.pipe(a) // {"input" : "toto"}
        .on('processed', s => {
        console.log('**** data');
    })
        .on('err', s => {
        console.log('**** ERROR');
    })
        .pipe(process.stdout);
    // var test = "{\"input\" : \"hello";
    // var test2 = " world\"}";
    // a.goReading = true;
    // a.push(test)
    // setTimeout(() => {
    //     a.goReading = true;
    //     a.push(test2)
    // }, 15000);
};
