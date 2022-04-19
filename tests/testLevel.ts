import { TRANSACTIONS, DB } from "../db";

(async () => {
	await TRANSACTIONS.put("hash1", "something");
	console.log(await TRANSACTIONS.get("hash1"));
	await DB.clear();
	console.log(await TRANSACTIONS.get("hash1"));
})();
