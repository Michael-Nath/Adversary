import { startClient } from "./client";
import { startServer } from "./server";
import * as Utils from "./utils";
import * as db from "./db";
import * as Discovery from "./discovery";
import * as Net from "net";
import { Block, PendingBlock } from "./types";

globalThis.connections = Discovery.obtainBootstrappingPeers() as Set<string>;
db.updateDBWithPeers(globalThis.connections);
globalThis.peerStatuses = {};
globalThis.sockets = new Set<Net.Socket>();
globalThis.pendingBlocks = new Map<string, PendingBlock>();
// Utils.resetStore()
// Utils.initializeStore()
startServer();
// startClient();
