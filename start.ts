import { startClient } from "./client"
import {startServer} from "./server"
import * as Utils from "./utils"
Utils.resetStore()
Utils.initializeStore()
startServer();
// startClient();
