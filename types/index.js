"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream = require("stream");
function isSlot(arg) {
    if (!arg)
        return false;
    if (!(arg instanceof stream.Writable))
        return false;
    if (!arg.hasOwnProperty('symbol'))
        return false;
    if (typeof arg['symbol'] !== 'string')
        return false;
    if (!arg.hasOwnProperty('streamContent'))
        return false;
    if (typeof arg['streamContent'] !== 'string')
        return false;
    return true;
}
exports.isSlot = isSlot;
function isManagement(arg) {
    if (!arg)
        return false;
    if (!arg.hasOwnProperty('jobManager'))
        return false;
    if (arg.hasOwnProperty('jobProfile')) {
        if (arg.jobProfile && typeof arg.jobProfile !== 'string')
            return false;
    }
    return true;
}
exports.isManagement = isManagement;
function isJobOpt(arg) {
    if (!arg)
        return false;
    if (!arg.hasOwnProperty('tagTask'))
        return false;
    if (typeof arg.tagTask !== 'string')
        return false;
    if (!arg.hasOwnProperty('script'))
        return false;
    if (typeof arg.script !== 'string')
        return false;
    if (!arg.hasOwnProperty('modules'))
        return false;
    if (!Array.isArray(arg.modules))
        return false;
    for (let l of arg.modules) {
        if (typeof l !== 'string')
            return false;
    }
    if (!arg.hasOwnProperty('exportVar'))
        return false;
    if (typeof arg.exportVar !== 'object')
        return false;
    if (!arg.hasOwnProperty('inputs'))
        return false;
    if (typeof arg.inputs !== 'object')
        return false;
    if (arg.inputs.hasOwnProperty('uuid')) {
        if (typeof arg.inputs.uuid !== 'string')
            return false;
    }
    return true;
}
exports.isJobOpt = isJobOpt;
