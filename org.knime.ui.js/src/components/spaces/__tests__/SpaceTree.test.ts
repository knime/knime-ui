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
      id: "mockProviderId",
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
          hasChildren: true,
          nodeKey: "provider_providerId",
        }),
      ]),
    );
  });

  it("provider: restrictTo", async () => {
    const { wrapper } = await doMount({
      mockSpaceProvider: createSpaceProvider({
        id: "providerId",
        name: "Mock Space Provider",
        type: SpaceProviderNS.TypeEnum.HUB,
      }),
      props: {
        providerRules: {
          restrictedTo: ["providerId"],
        },
      },
    });
    await flushPromises();

    const providerNodes = wrapper.findAllComponents({ name: "TreeNode" });
    expect(providerNodes.length).toBe(1);
    expect(providerNodes?.at(0)?.vm.node.origin).toEqual(
      expect.objectContaining({
        spaceProviderId: "providerId",
        type: "provider",
      }),
    );
  });

  it("provider: exclude", async () => {
    const { wrapper } = await doMount({
      mockSpaceProvider: createSpaceProvider({
        id: "providerId",
        name: "Mock Space Provider",
        type: SpaceProviderNS.TypeEnum.HUB,
      }),
      props: {
        providerRules: {
          exclude: ["providerId"],
        },
      },
    });
    await flushPromises();

    const providerNodes = wrapper.findAllComponents({ name: "TreeNode" });
    expect(providerNodes.length).toBe(1);
    expect(providerNodes?.at(0)?.vm.node.origin).toEqual(
      expect.objectContaining({
        spaceProviderId: "local",
        type: "item",
      }),
    );
  });

  it("should load descendent data", async () => {
    const { wrapper, dispatchSpy } = await doMount({
      mockSpaceProvider: createSpaceProvider({
        id: "someMockProviderId",
        name: "Mock Space Provider",
        type: SpaceProviderNS.TypeEnum.HUB,
      }),
    });

    const providerNodes = wrapper.findAllComponents({ name: "TreeNode" });

    dispatchSpy.mockClear();
    await providerNodes[0].trigger("click");
    await flushPromises();
    expect(dispatchSpy).toHaveBeenCalledWith(
      "spaces/fetchWorkflowGroupContentByIdTriplet",
      {
        spaceProviderId: "local",
        spaceId: "space1",
        itemId: "root",
      },
    );

    dispatchSpy.mockClear();
    await providerNodes[1].trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/reloadProviderSpaces", {
      id: "someMockProviderId",
    });
  });

  it("should connect provider", async () => {
    const { wrapper, dispatchSpy } = await doMount({
      mockSpaceProvider: createSpaceProvider({
        id: "someMockProviderId",
        name: "Mock Space Provider",
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: false,
      }),
    });

    const mockProviderNode = wrapper
      .findAllComponents({ name: "TreeNode" })
      .filter((providerNode) => {
        const nodeOrigin = providerNode.vm.node.origin;
        return (
          nodeOrigin.type === "provider" &&
          nodeOrigin.spaceProviderId === "someMockProviderId"
        );
      })
      .at(0);
    expect(mockProviderNode).toBeTruthy();

    dispatchSpy.mockClear();
    await mockProviderNode!.trigger("click");
    await flushPromises();
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
      spaceProviderId: "someMockProviderId",
    });
  });
});
