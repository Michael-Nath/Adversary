"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.obtainBootstrappingPeers = exports.sendPeers = exports.updatePeers = exports.getPeers = exports.getHello = exports.getHelloFromPeer = exports.getHelloMessage = exports.getDataFromNode = exports.connectToNode = void 0;
var Utils = require("./utils");
var fs = require("fs");
var path = require("path");
var canonicalize = require("canonicalize");
function connectToNode(client) {
    console.log("TCP connection established with the server.");
    console.log(globalThis.peerStatuses);
    var helloMessage = {
        type: "hello",
        version: "0.8.0",
        agent: "Adversary Node"
    };
    client.write(canonicalize(helloMessage));
}
exports.connectToNode = connectToNode;
function getDataFromNode(client, peer, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    if ((!globalThis.peerStatuses[peer] || false) &&
        !Utils.isValidFirstMessage(response)) {
        var errorMessage = {
            type: "error",
            error: Utils.HELLO_ERROR
        };
        client.write(canonicalize(errorMessage));
        client.end();
    }
    else {
        (!globalThis.peerStatuses[peer] || false) &&
            client.write(canonicalize({
                type: "acknowledgement",
                message: "Client has received server message"
            }));
        globalThis.peerStatuses[peer] = true;
    }
    console.log("Data received from the server: ".concat(chunk.toString(), "."));
    console.log(globalThis.peerStatuses);
}
exports.getDataFromNode = getDataFromNode;
function getHelloMessage(socket, peer, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    if (!globalThis.peerStatuses[peer] && !Utils.isValidFirstMessage(response)) {
        var errorMessage = {
            type: "error",
            error: Utils.HELLO_ERROR
        };
        socket.write(canonicalize(errorMessage));
        socket.end();
    }
    else {
        globalThis.peerStatuses[peer] = true;
    }
    console.log("Data received from the server: ".concat(chunk.toString(), "."));
    console.log(globalThis.peerStatuses);
}
exports.getHelloMessage = getHelloMessage;
function getHelloFromPeer(socket, peer, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    if (!globalThis.serverPeerStatusses[peer] &&
        !Utils.isValidFirstMessage(response)) {
        var errorMessage = {
            type: "error",
            error: Utils.HELLO_ERROR
        };
        socket.write(canonicalize(errorMessage));
        socket.destroy();
    }
    else {
        globalThis.serverPeerStatuses[peer] = true;
    }
}
exports.getHelloFromPeer = getHelloFromPeer;
function getHello(socket, peer, chunk, weInitiated) {
    var _this = this;
    var response = Utils.validateMessage(chunk.toString());
    var peerExists;
    var list = weInitiated ? "clientPeers" : "serverPeers";
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = peer;
                    return [4, Utils.DB.get(list)];
                case 1:
                    peerExists = _a in (_b.sent());
                    return [2];
            }
        });
    }); })();
    if (!peerExists && !Utils.isValidFirstMessage(response)) {
        var errorMessage = {
            type: "error",
            error: Utils.HELLO_ERROR
        };
        socket.write(canonicalize(errorMessage));
        socket.destroy();
    }
    else {
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var newPeerEntry;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newPeerEntry = {};
                        newPeerEntry[peer] = [];
                        return [4, Utils.DB.merge(list, newPeerEntry)];
                    case 1:
                        _a.sent();
                        return [2];
                }
            });
        }); })();
    }
}
exports.getHello = getHello;
function getPeers(socket) {
    var getPeersMessage = {
        type: "getpeers"
    };
    socket.write(canonicalize(getPeersMessage));
}
exports.getPeers = getPeers;
function updatePeers(socket, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    if (response["error"]) {
        Utils.sendErrorMessage(socket, response["error"]["error"]);
    }
    if (response["data"]["type"] != "peers")
        return;
    var newPeers = response["data"]["peers"];
    newPeers.forEach(function (newPeer) {
        globalThis.peers.add(newPeer);
    });
    console.log(globalThis.peers);
}
exports.updatePeers = updatePeers;
function sendPeers(client, peer, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    console.log(response);
    if (response["error"]) {
        Utils.sendErrorMessage(client, response["error"]["error"]);
    }
    if (response["data"]["type"] != "getpeers")
        return;
    var peersArray = [];
    globalThis.peers.forEach(function (peer) {
        peersArray.push("".concat(peer, ":").concat(Utils.PORT));
    });
    var peersMessage = {
        type: "peers",
        peers: peersArray
    };
    client.write(canonicalize(peersMessage));
}
exports.sendPeers = sendPeers;
function obtainBootstrappingPeers() {
    try {
        var data = fs.readFileSync(path.join(__dirname, "peers.txt"), {
            encoding: "utf8"
        });
        return new Set(data.split(/\r?\n/));
    }
    catch (err) {
        console.error(err);
        return;
    }
}
exports.obtainBootstrappingPeers = obtainBootstrappingPeers;
//# sourceMappingURL=discovery.js.map