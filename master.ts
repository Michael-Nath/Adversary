import { startClient } from "./client";
import { startServer } from "./server";
import * as Utils from "./utils"
import * as Discovery from "./discovery";

globalThis.connections = Discovery.obtainBootstrappingPeers() as Set<string>;
Utils.updateDBWithPeers(globalThis.connections);
globalThis.peerStatuses = {};
// Utils.resetStore()
// Utils.initializeStore()
// startClient();

startServer();
