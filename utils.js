"use strict";
exports.__esModule = true;
exports.validateMessage = exports.isValidFirstMessage = exports.ALLOWABLE_TYPES = exports.FORMAT_ERROR = exports.TYPE_ERROR = exports.HELLO_ERROR = void 0;
exports.HELLO_ERROR = "";
exports.TYPE_ERROR = "Unsupported message type received\n";
exports.FORMAT_ERROR = "Invalid message format\n";
exports.ALLOWABLE_TYPES = new Set([
    "transaction",
    "block",
    "hello",
    "acknowledgement",
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
function validateMessage(message) {
    var json = {
        valid: false,
        error: {},
        data: {}
    };
    try {
        message = JSON.parse(message);
        json["data"] = message;
        if (!exports.ALLOWABLE_TYPES.has(message["type"])) {
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