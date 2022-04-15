import { validateTransaction, outpointExists } from "./utils";
import type { Transaction } from "./types";
const dummyTransaction: Transaction = {
	inputs: [
		{
			outpoint: {
				index: 0,
				txid: "1bb37b637d07100cd26fc063dfd4c39a7931cc88dae3417871219715a5e374af",
			},
			sig: "1d0d7d774042607c69a87ac5f1cdf92bf474c25fafcc089fe667602bfefb0494726c519e92266957429ced875256e6915eb8cea2ea66366e739415efc47a6805",
		},
	],
	outputs: [
		{
			pubkey:
				"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9",
			value: 10,
		},
	],
	type: "transaction",
};

const response = validateTransaction(dummyTransaction);
console.log(response);

// console.log(outpointExists(dummyTransaction["inputs"][0]["outpoint"]));
