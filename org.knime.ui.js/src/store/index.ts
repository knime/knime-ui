import { createStore } from "vuex";
import { API } from "@api";
import type { RootStoreState } from "./types";

import * as application from "./application";
import * as canvas from "./canvas";
import * as nodeRepository from "./nodeRepository";
import * as panel from "./panel";
import * as selection from "./selection";
import * as workflow from "./workflow";
import * as api from "./uiExtApi";
import * as spaces from "./spaces";
import * as quickAddNodes from "./quickAddNodes";
import * as aiAssistant from "./aiAssistant";

export const initStore = () => {
  return createStore<RootStoreState>({
    modules: {
      application: { namespaced: true, ...application },
      canvas: { namespaced: true, ...canvas },
      nodeRepository: { namespaced: true, ...nodeRepository },
      panel: { namespaced: true, ...panel },
      selection: { namespaced: true, ...selection },
      workflow: { namespaced: true, ...workflow },
      spaces: { namespaced: true, ...spaces },
      quickAddNodes: { namespaced: true, ...quickAddNodes },
      // TODO: NXT-1217 Remove this unnecessary store once the issue in the ticket
      // can be solved in a better way
      api: { namespaced: true, ...api },
      // Only use store if AI assistant is available
      ...(API.desktop.isAiAssistantBackendAvailable() && {
        aiAssistant: { namespaced: true, ...aiAssistant },
      }),
    },
  });
};
