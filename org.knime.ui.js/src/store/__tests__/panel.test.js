import { beforeEach, describe, expect, it } from "vitest";

import { mockVuexStore } from "@/test/utils";
import * as panelStoreConfig from "../panel";

describe("panel store", () => {
  let store;

  beforeEach(() => {
    store = mockVuexStore({
      application: {
        state: {
          activeProjectId: "activeProject33",
        },
      },
      panel: panelStoreConfig,
    });
  });

  it("toggles expanded", () => {
    expect(store.state.panel.expanded).toBe(true);

    store.commit("panel/toggleExpanded");

    expect(store.state.panel.expanded).toBe(false);
  });

  it("sets activeTab", () => {
    const projectId = "someProjectId1";
    const anotherProject = "anotherProjectId";
    store.state.panel.activeTab = { [projectId]: "somethingElse" };
    expect(store.state.panel.expanded).toBe(true);
    expect(store.state.panel.activeTab[projectId]).not.toBe("description");

    store.commit("panel/setActiveTab", {
      projectId,
      activeTab: panelStoreConfig.TABS.CONTEXT_AWARE_DESCRIPTION,
    });
    expect(store.state.panel.expanded).toBe(true);
    expect(store.state.panel.activeTab[projectId]).toBe("description");

    store.commit("panel/setActiveTab", {
      projectId,
      activeTab: panelStoreConfig.TABS.NODE_REPOSITORY,
    });
    expect(store.state.panel.expanded).toBe(true);
    expect(store.state.panel.activeTab[projectId]).toBe("nodeRepository");

    store.commit("panel/setActiveTab", {
      projectId: anotherProject,
      activeTab: panelStoreConfig.TABS.SPACE_EXPLORER,
    });
    expect(store.state.panel.expanded).toBe(true);
    expect(store.state.panel.activeTab[anotherProject]).toBe("spaceExplorer");
    expect(store.state.panel.activeTab[projectId]).toBe("nodeRepository");
  });

  it("sets active tab for current project", async () => {
    await store.dispatch(
      "panel/setCurrentProjectActiveTab",
      panelStoreConfig.TABS.NODE_REPOSITORY,
    );
    expect(store.state.panel.activeTab.activeProject33).toBe("nodeRepository");
  });

  it("closes the panel", () => {
    store.state.panel.expanded = true;
    store.commit("panel/closePanel");

    expect(store.state.panel.expanded).toBe(false);
  });
});
