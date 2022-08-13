/**
 * @author Michael D. Nath, Kenan Hasanaliyev
 * @email mnath@stanford.edu, kenanhas@stanford.edu
 * @file master.ts
 * @desc master.ts boots up client that connects to peers and server which handles incoming connections.
 */

import { startClient } from "./client";
import { startServer } from "./server";
import * as Utils from "./utils";
const canonicalize = require("canonicalize");

Utils.initializeGlobals();
startServer();
const getChainTipMessage =
	canonicalize({ type: "getchaintip" }) +
	"\n" +
	canonicalize({ type: "getmempool" });
startClient(getChainTipMessage);
