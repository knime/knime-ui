import { createStore as __createStore } from "vuex";

import * as apiStoreConfig from "./api";
import * as notificationsConfig from "./notifications";
import * as wizardExecutionStoreConfig from "./wizardExecution";

export const createStore = (api) => {
  const store = __createStore({
    modules: {
      api: {
        namespaced: true,
        ...apiStoreConfig,
      },
      wizardExecution: {
        namespaced: true,
        ...wizardExecutionStoreConfig,
      },
      notification: {
        namespaced: true,
        ...notificationsConfig,
      },
    },
  });

  store.$api = api;
  return store;
};
