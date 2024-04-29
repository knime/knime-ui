import { createStore } from "vuex";
import type { RootStoreState } from "./types";

import * as application from "./application";
import * as canvas from "./canvas";
import * as nodeRepository from "./nodeRepository";
import * as panel from "./panel";
import * as selection from "./selection";
import * as workflow from "./workflow";
import * as spaces from "./spaces";
import * as quickAddNodes from "./quickAddNodes";
import * as aiAssistant from "./aiAssistant";
import * as settings from "./settings";
import * as nodeConfiguration from "./nodeConfiguration";
import * as workflowMonitor from "./workflowMonitor";

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
      settings: { namespaced: true, ...settings },
      aiAssistant: { namespaced: true, ...aiAssistant },
      nodeConfiguration: { namespaced: true, ...nodeConfiguration },
      workflowMonitor: { namespaced: true, ...workflowMonitor },
    },
  });
};
