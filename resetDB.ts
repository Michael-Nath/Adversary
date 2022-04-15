import * as db from "./db"

(async () => {
    await db.resetStore()
    await db.initializeStore()
})();
