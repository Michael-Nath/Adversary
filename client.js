"use strict";
exports.__esModule = true;
exports.smth = void 0;
var Net = require("net");
var canonicalize = require("canonicalize");
var host = "localhost";
var firstMessageHello = false;
var client = new Net.Socket();
function smth() {
    globalThis.peerStatuses = { hello: true };
}
exports.smth = smth;
//# sourceMappingURL=client.js.map