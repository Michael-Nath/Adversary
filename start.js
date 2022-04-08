"use strict";
exports.__esModule = true;
var server_1 = require("./server");
var Utils = require("./utils");
Utils.resetStore();
Utils.initializeStore();
(0, server_1.startServer)();
//# sourceMappingURL=start.js.map