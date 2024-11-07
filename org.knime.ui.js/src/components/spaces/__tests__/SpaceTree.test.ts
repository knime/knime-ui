/* eslint-disable max-lines */
import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

import { Tree } from "@knime/virtual-tree";

import { API } from "@/api";
import { SpaceProviderNS } from "@/api/custom-types";
import { SpaceItem } from "@/api/gateway-api/generated-api";
import * as spacesStore from "@/store/spaces";
import { createSpaceProvider } from "@/test/factories";
import { deepMocked, mockVuexStore } from "@/test/utils";
import SpaceTree from "../SpaceTree.vue";

const mockedAPI = deepMocked(API);

const fetchWorkflowGroupContentResponse: Awaited<
  ReturnType<typeof API.space.listWorkflowGroup>
> = {
  path: [],
  items: [
    {
      id: "1",
      name: "Folder 1",
      type: SpaceItem.TypeEnum.WorkflowGroup,
    },
    {
      id: "2",
      name: "Folder 2",
      type: SpaceItem.TypeEnum.WorkflowGroup,
    },
    {
      id: "4",
      name: "File 2",
      type: SpaceItem.TypeEnum.Workflow,
    },
  ],
};

describe("SpaceTree.vue", () => {
  const doMount = async ({
    props = {} as Partial<InstanceType<typeof SpaceTree>["$props"]>,
    mockResponse = fetchWorkflowGroupContentResponse,
    mockGetSpaceItems = null,
    mockSpaceProvider = createSpaceProvider({
      id: "provider",
      type: SpaceProviderNS.TypeEnum.HUB,
    }),
  } = {}) => {
    if (mockGetSpaceItems) {
      mockedAPI.space.listWorkflowGroup.mockImplementation(
        mockGetSpaceItems ?? (() => Promise.resolve(mockResponse)),
      );
    }
    mockedAPI.space.createWorkflow.mockResolvedValue({ type: "Workflow" });

    const store = mockVuexStore({
      spaces: spacesStore,
      application: {},
    });
    const local = createSpaceProvider();

    store.commit("spaces/setSpaceProviders", {
      [local.id]: local,
      [mockSpaceProvider.id]: mockSpaceProvider,
    });

    const dispatchSpy = vi.spyOn(store, "dispatch");
    const commitSpy = vi.spyOn(store, "commit");

    const wrapper = mount(SpaceTree, {
      props: { selectedItemIds: [], projectId: "", ...props },
      global: {
        plugins: [store],
      },
    });

    await flushPromises();
    return { wrapper, store, dispatchSpy, commitSpy };
  };

  it("should load root data on created", async () => {
    const { wrapper } = await doMount({
      mockSpaceProvider: createSpaceProvider({
        id: "providerId",
        name: "Mock Space Provider",
        type: SpaceProviderNS.TypeEnum.HUB,
      }),
    });
    await flushPromises();

    expect(wrapper.findComponent(SpaceTree).exists()).toBe(true);
    expect(wrapper.findComponent(Tree).props("source")).toEqual(
      expect.arrayContaining([
        // special handling for local space (skips provider and group node)
        expect.objectContaining({
          itemId: "root",
          spaceId: "space1",
          spaceProviderId: "local",
          name: "Space 1",
        }),
        expect.objectContaining({
          name: "Mock Space Provider",
          spaceProviderId: "providerId",
          children: expect.any(Array),
          nodeKey: "provider_providerId",
        }),
      ]),
    );
  });

  // it("should load descendent data", async () => {
  //   const { wrapper, dispatchSpy } = await doMount();

  //   //const callback = vi.fn();
  //   wrapper.findAll(".tree-node")[0].trigger("click");

  //   // initial fetch of root has happened
  //   // mockedAPI.space.listWorkflowGroup.mockResolvedValue({
  //   //   path: [],
  //   //   items: [],
  //   // });

  //   await flushPromises;

  //   expect(dispatchSpy).toHaveBeenLastCalledWith(
  //     "spaces/fetchWorkflowGroupContentByIdTriplet",
  //     {
  //       spaceProviderId: "local",
  //       spaceId: "Space 1",
  //       itemId: "root",
  //     },
  //   );
  // });

  // describe("selection", () => {
  //   it("should select a workflow", async () => {
  //     const { wrapper, dispatchSpy } = await doMount();

  //     wrapper
  //       .findComponent(FileExplorer)
  //       .vm.$emit("openFile", createMockWorkflow());

  //     await nextTick();

  //     expect(dispatchSpy).toHaveBeenCalledWith("spaces/openProject", {
  //       providerId: "local",
  //       spaceId: "local",
  //       itemId: "dummy",
  //       $router: expect.anything(),
  //     });
  //   });

  // it("should select a folder", async () => {
  //   const { wrapper, dispatchSpy } = await doMount();

  //   wrapper
  //     .findComponent(FileExplorer)
  //     .vm.$emit("openFile", createMockComponent());

  //   await nextTick();

  //   expect(dispatchSpy).toHaveBeenCalledWith("spaces/openProject", {
  //     providerId: "local",
  //     spaceId: "local",
  //     itemId: "dummy",
  //     $router: expect.anything(),
  //   });
  // });

  // it("should select a space provider", async () => {
  //   const { wrapper, dispatchSpy } = await doMount();

  //   wrapper
  //     .findComponent(FileExplorer)
  //     .vm.$emit("openFile", createMockComponent());

  //   await nextTick();

  //   expect(dispatchSpy).toHaveBeenCalledWith("spaces/openProject", {
  //     providerId: "local",
  //     spaceId: "local",
  //     itemId: "dummy",
  //     $router: expect.anything(),
  //   });
  // });
  // });
});
