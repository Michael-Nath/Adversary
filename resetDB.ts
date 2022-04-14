import * as Utils from "./utils"

(async () => {
    await Utils.resetStore()
    await Utils.initializeStore()
})();
