import { describe, expect, it } from "vitest";

import { TABS } from "@/store/panel";
import { mockStores } from "@/test/utils/mockStores";

describe("panel store", () => {
  it("toggles expanded", () => {
    const { panelStore } = mockStores();

    expect(panelStore.expanded).toBe(true);
    panelStore.toggleExpanded();
    expect(panelStore.expanded).toBe(false);
  });

  it("sets activeTab", () => {
    const { panelStore } = mockStores();

    const projectId = "someProjectId1";
    const anotherProject = "anotherProjectId";
    panelStore.setActiveTab({
      projectId,
      activeTab: TABS.NODE_DIALOG,
    });
    expect(panelStore.expanded).toBe(true);
    expect(panelStore.activeTab[projectId]).not.toBe("description");

    panelStore.setActiveTab({
      projectId,
      activeTab: TABS.CONTEXT_AWARE_DESCRIPTION,
    });
    expect(panelStore.expanded).toBe(true);
    expect(panelStore.activeTab[projectId]).toBe("description");

    panelStore.setActiveTab({
      projectId,
      activeTab: TABS.NODE_REPOSITORY,
    });
    expect(panelStore.expanded).toBe(true);
    expect(panelStore.activeTab[projectId]).toBe("nodeRepository");

    panelStore.setActiveTab({
      projectId: anotherProject,
      activeTab: TABS.SPACE_EXPLORER,
    });
    expect(panelStore.expanded).toBe(true);
    expect(panelStore.activeTab[anotherProject]).toBe("spaceExplorer");
    expect(panelStore.activeTab[projectId]).toBe("nodeRepository");
  });

  it("sets active tab for current project", () => {
    const { panelStore, applicationStore } = mockStores();

    applicationStore.activeProjectId = "projectId1";
    panelStore.setCurrentProjectActiveTab(TABS.NODE_REPOSITORY);

    expect(panelStore.activeTab.projectId1).toBe("nodeRepository");
  });

  it("closes the panel", () => {
    const { panelStore } = mockStores();

    panelStore.expanded = true;
    panelStore.closePanel();

    expect(panelStore.expanded).toBe(false);
  });
});
