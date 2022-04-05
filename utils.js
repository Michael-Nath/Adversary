"use strict";
exports.__esModule = true;
exports.validateMessage = exports.sendErrorMessage = exports.isValidFirstMessage = exports.BOOTSTRAPPING_PEERS = exports.ALLOWABLE_TYPES = exports.PORT = exports.FORMAT_ERROR = exports.TYPE_ERROR = exports.HELLO_ERROR = void 0;
var canonicalize = require("canonicalize");
exports.HELLO_ERROR = "";
exports.TYPE_ERROR = "Unsupported message type received\n";
exports.FORMAT_ERROR = "Invalid message format\n";
exports.PORT = 18018;
exports.ALLOWABLE_TYPES = new Set([
    "transaction",
    "block",
    "hello",
    "acknowledgement",
    "getpeers",
    "peers"
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
    client.end();
}
exports.sendErrorMessage = sendErrorMessage;
function validateMessage(message) {
    var json = {};
    try {
        var parsedMessage = JSON.parse(message);
        json["data"] = parsedMessage;
        if (!exports.ALLOWABLE_TYPES.has(parsedMessage["type"])) {
            json["error"] = { type: "error", error: exports.TYPE_ERROR };
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
//# sourceMappingURL=utils.js.map