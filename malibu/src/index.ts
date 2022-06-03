import { logger } from "./logger";
// import { network } from "./network";
// import { chainManager } from "./chain";
// import { mempool } from "./mempool";
import { miner } from "./miner";

const worker = require("worker_threads");
const BIND_PORT = 18018;
const BIND_IP = "0.0.0.0";

function main() {
	if (worker.isMainThread) {
		logger.info(`Malibu - A Marabu node`);
		logger.info(`Dionysis Zindros <dionyziz@stanford.edu>`);
		const worker_bee = new worker.Worker(__filename);
		worker_bee.on("error", (error: Error) => {
			console.log("Error");
			console.log(error);
		});
		worker_bee.on("message", (message: string) => {
			console.log("Message", message);
		});

		// await chainManager.init();
		// await mempool.init();
		// network.init(BIND_PORT, BIND_IP);
	} else {
		miner.mine();
	}
}

main();
