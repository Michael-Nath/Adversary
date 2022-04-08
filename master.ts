import { startClient } from "./client";
import { startServer } from "./server";
import * as Utils from "./utils"
import * as Discovery from "./discovery";

globalThis.peers = Discovery.obtainBootstrappingPeers() as Set<string>;
Utils.updateDBWithPeers(false, globalThis.peers);

startClient();
// startServer();
