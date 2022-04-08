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
<<<<<<< HEAD
exports.sanitizeString = exports.routeMessage = exports.resetStore = exports.initializeStore = exports.validateMessage = exports.sendErrorMessage = exports.isValidFirstMessage = exports.BOOTSTRAPPING_PEERS = exports.ALLOWABLE_TYPES = exports.PORT = exports.DB = exports.HELLO_MESSAGE = exports.WELCOME_ERROR = exports.FORMAT_ERROR = exports.TYPE_ERROR = exports.HELLO_ERROR = void 0;
=======
exports.sanitizeChunk = exports.routeMessage = exports.resetStore = exports.initializeStore = exports.validateMessage = exports.sendErrorMessage = exports.isValidFirstMessage = exports.BOOTSTRAPPING_PEERS = exports.ALLOWABLE_TYPES = exports.PORT = exports.DB = exports.HELLO_MESSAGE = exports.WELCOME_ERROR = exports.FORMAT_ERROR = exports.TYPE_ERROR = exports.HELLO_ERROR = void 0;
>>>>>>> 54fd9c1079308d2b5a91cea87bd33edfed888544
var level_ts_1 = require("level-ts");
var Discovery = require("./discovery");
var canonicalize = require("canonicalize");
var DATABASE_PATH = "./database";
exports.HELLO_ERROR = "";
exports.TYPE_ERROR = "Unsupported message type received\n";
exports.FORMAT_ERROR = "Invalid message format\n";
exports.WELCOME_ERROR = "Must send hello message first.";
exports.HELLO_MESSAGE = {
<<<<<<< HEAD
    type: "Adversary Node",
    version: "0.8.0",
    agent: "test agent"
=======
    type: "hello",
    version: "0.8.0",
    agent: "Adversary"
>>>>>>> 54fd9c1079308d2b5a91cea87bd33edfed888544
};
exports.DB = new level_ts_1["default"](DATABASE_PATH);
exports.PORT = 18018;
exports.ALLOWABLE_TYPES = new Set([
    "transaction",
    "block",
    "hello",
    "getpeers",
    "peers",
]);
exports.BOOTSTRAPPING_PEERS = new Set([
    "149.28.204.235",
    "149.28.220.241",
    "139.162.130.195",
    "localhost",
]);
function isValidFirstMessage(response) {
    if (response["data"]["type"] == "hello" &&
        response["data"]["version"] == "0.8.0") {
        return true;
    }
    else {
        return false;
    }
}
exports.isValidFirstMessage = isValidFirstMessage;
function sendErrorMessage(client, error) {
    var errorMessage = {
        type: "error",
        error: error
    };
    client.write(canonicalize(errorMessage));
    client.destroy();
}
exports.sendErrorMessage = sendErrorMessage;
function validateMessage(message, peer) {
    var json = {};
    console.log("MSG TO PARSE: ", message);
    try {
        var parsedMessage = JSON.parse(message);
        json["data"] = parsedMessage;
        if (!exports.ALLOWABLE_TYPES.has(parsedMessage["type"])) {
            json["error"] = { type: "error", error: exports.TYPE_ERROR };
            return json;
        }
        if (parsedMessage["type"] != "hello" && !globalThis.peers.has(peer)) {
            json["error"] = { type: "error", error: exports.WELCOME_ERROR };
            return json;
        }
    }
    catch (err) {
        json["error"] = { type: "error", error: exports.FORMAT_ERROR };
        console.error(err);
        return json;
    }
    json["valid"] = true;
    return json;
}
exports.validateMessage = validateMessage;
function initializeStore() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, exports.DB.exists("peers")];
                case 1:
                    if (!(_a.sent())) {
                        exports.DB.put("peers", {});
                    }
                    return [2];
            }
        });
    });
}
exports.initializeStore = initializeStore;
function resetStore() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            exports.DB.del("peers");
            return [2];
        });
    });
}
exports.resetStore = resetStore;
function routeMessage(msg, socket, weInitiated, peer) {
    var response = validateMessage(msg, peer);
    if (response["error"]) {
        sendErrorMessage(socket, response["error"]["error"]);
        return;
    }
    if (response["data"]["type"] == "hello")
        Discovery.getHello(socket, peer, response);
    else if (response["data"]["type"] == "peers")
        Discovery.updatePeers(socket, response);
    else if ((response["data"]["type"] = "getpeers"))
        Discovery.sendPeers(socket, peer, response);
}
exports.routeMessage = routeMessage;
function sanitizeString(socket, peer, str, willComplete) {
    globalThis.peerStatuses[socket.id]["buffer"] += str;
    if (willComplete) {
        var message = globalThis.peerStatuses[socket.id]["buffer"];
        globalThis.peerStatuses[socket.id]["buffer"] = "";
        return message;
    }
    return "";
}
exports.sanitizeString = sanitizeString;
//# sourceMappingURL=utils.js.map