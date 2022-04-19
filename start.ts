import { startClient } from "./client"
import {startServer} from "./server"
import * as db from "./db"
db.resetStore()
startServer();
// startClient();
