import { startClient } from "./client";
import { startServer } from "./server";
import * as Utils from "./utils";
import * as db from "./db";
import * as Discovery from "./discovery";
import * as Net from "net";
import { Block, PendingBlock } from "./types";
import { EventEmitter } from "stream";
const canonicalize = require("canonicalize");

globalThis.connections = Discovery.obtainBootstrappingPeers() as Set<string>;
db.updateDBWithPeers(globalThis.connections);
globalThis.peerStatuses = {};
globalThis.sockets = new Set<Net.Socket>();
globalThis.pendingBlocks = new Map<string, PendingBlock>();
globalThis.emitter = new EventEmitter();
globalThis.chainTip = null;
// Utils.resetStore()
// Utils.initializeStore()
startServer();
const getChainTipMessage = canonicalize({ type: "getchaintip" });
startClient(getChainTipMessage);
