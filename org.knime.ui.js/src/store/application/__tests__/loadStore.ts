import { vi } from "vitest";

import { API } from "@api";
import { deepMocked, mockVuexStore } from "@/test/utils";

import * as applicationStore from "@/store/application";
import * as spacesStore from "@/store/spaces";
import * as workflowStore from "@/store/workflow";
import * as selectionStore from "@/store/selection";
import type { RootStoreState } from "@/store/types";
import { createWorkflow } from "@/test/factories";

const mockedAPI = deepMocked(API);

export const applicationState = {
  openProjects: [{ projectId: "foo", name: "bar" }],
};

export const loadStore = () => {
  mockedAPI.application.getState.mockReturnValue(applicationState);
  const loadWorkflow = deepMocked(API).workflow.getWorkflow;
  loadWorkflow.mockResolvedValue({ workflow: { info: { containerId: "" } } });

  const actions = {
    canvas: {
      restoreScrollState: vi.fn(),
    },
    spaces: {
      fetchAllSpaceProviders: vi.fn(),
    },
  };

  const getters = {
    canvas: {
      getCanvasScrollState: vi.fn(() => () => ({ mockCanvasState: true })),
      screenToCanvasCoordinates: vi.fn(() => ([x, y]) => [x, y]),
    },
  };

  const storeConfig = {
    application: applicationStore,
    workflow: workflowStore,
    nodeRepository: {
      actions: {
        closeDescriptionPanel: vi.fn(),
        resetSearchAndCategories: vi.fn(),
      },
    },
    spaces: {
      ...spacesStore,
      actions: {
        ...spacesStore.actions,
        ...actions.spaces,
      },
    },
    canvas: {
      state: {
        getScrollContainerElement: vi.fn(() => {
          const div = document.createElement("div");
          div.appendChild(
            document.createElementNS("http://www.w3.org/2000/svg", "svg"),
          );
          return div;
        }),
      },
      getters: getters.canvas,
      actions: actions.canvas,
    },
    selection: selectionStore,
    settings: {
      state: {
        settings: {
          uiScale: 1.0,
        },
      },
    },
  };

  const store = mockVuexStore<RootStoreState>(storeConfig);
  store.commit("workflow/setActiveWorkflow", createWorkflow());
  store.state.workflow.activeWorkflow.projectId = "foo";

  const dispatchSpy = vi.spyOn(store, "dispatch");
  const commitSpy = vi.spyOn(store, "commit");

  const mockRouter = {
    push: vi.fn(),
  };

  return {
    store,
    dispatchSpy,
    commitSpy,
    mockRouter,
    mockedGetters: getters,
    mockedActions: actions,
    loadWorkflow,
    subscribeEvent: API.event.subscribeEvent,
    unsubscribeEventListener: API.event.unsubscribeEventListener,
  };
};
