import { describe, expect, it, vi } from "vitest";
import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { API } from "@api";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

describe("workflow::componentInteractions", () => {
  it("should link components", async () => {
    const { store } = await loadStore();
    const dispatchSpy = vi.spyOn(store, "dispatch");
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    await store.dispatch("workflow/linkComponent", { nodeId: "root:2" });
    expect(mockedAPI.desktop.openLinkComponentDialog).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      "spaces/fetchWorkflowGroupContent",
      expect.anything(),
      expect.anything(),
    );

    mockedAPI.desktop.openLinkComponentDialog.mockReturnValueOnce(true);

    await store.dispatch("workflow/linkComponent", { nodeId: "root:2" });
    expect(mockedAPI.desktop.openLinkComponentDialog).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      "spaces/fetchWorkflowGroupContent",
      expect.anything(),
      expect.anything(),
    );
  });

  it("should update component", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    store.dispatch("workflow/updateComponents", { nodeIds: ["root:2"] });
    expect(
      mockedAPI.workflowCommand.UpdateLinkedComponents,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeIds: ["root:2"],
    });
  });

  it("should unlink component", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    store.dispatch("workflow/unlinkComponent", { nodeId: "root:2" });
    expect(
      mockedAPI.workflowCommand.UpdateComponentLinkInformation,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });

  it("should change hub item version", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    store.dispatch("workflow/changeHubItemVersion", { nodeId: "root:2" });
    expect(
      mockedAPI.desktop.openChangeComponentHubItemVersionDialog,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });

  it("should change component link type", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", createWorkflow());

    store.dispatch("workflow/changeComponentLinkType", { nodeId: "root:2" });
    expect(
      mockedAPI.desktop.openChangeComponentLinkTypeDialog,
    ).toHaveBeenCalledWith({
      projectId: "project1",
      workflowId: "root",
      nodeId: "root:2",
    });
  });
});
