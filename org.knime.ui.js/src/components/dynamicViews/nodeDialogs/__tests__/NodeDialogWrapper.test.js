import { expect, describe, it } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";
import * as selectionStore from "@/store/selection";

import NodeDialogWrapper from "../NodeDialogWrapper.vue";
import NodeDialogLoader from "../NodeDialogLoader.vue";

describe("NodeDialogWrapper.vue", () => {
  const dummyNodes = {
    node1: {
      id: "node1",
      outPorts: [{ typeId: "flowVariable", index: 0 }],
      isLoaded: false,
      state: {
        executionState: "UNSET",
      },
      allowedActions: {
        canExecute: false,
      },
    },
  };

  const createNode = (customProperties) => ({
    ...dummyNodes.node1,
    ...customProperties,
  });

  const createStore = ({ nodes = dummyNodes } = {}) => {
    const $store = mockVuexStore({
      application: {
        state: {
          activeProjectId: "project-1",
        },
      },
      workflow: {
        state: {
          activeWorkflow: {
            nodes,
            info: {
              containerId: "workflow-1",
            },
          },
        },
      },
      selection: selectionStore,
    });

    return $store;
  };
  const doShallowMount = ($store = createStore()) =>
    shallowMount(NodeDialogWrapper, {
      global: { plugins: [$store] },
    });

  it("should render the node dialog when the selected node `hasDialog` property is true", async () => {
    const nodeWithoutDialog = createNode({ id: "1", hasDialog: false });
    const nodeWithDialog = createNode({ id: "2", hasDialog: true });
    const store = createStore({
      nodes: {
        [nodeWithoutDialog.id]: nodeWithoutDialog,
        [nodeWithDialog.id]: nodeWithDialog,
      },
    });
    const wrapper = doShallowMount(store);
    store.commit("selection/clearSelection");

    // no nodes selected -> not displayed
    expect(wrapper.findComponent(NodeDialogLoader).exists()).toBe(false);

    // select node without dialog -> not displayed
    store.commit("selection/addNodesToSelection", [nodeWithoutDialog.id]);
    await Vue.nextTick();
    expect(wrapper.findComponent(NodeDialogLoader).exists()).toBe(false);

    // select node with dialog -> not displayed
    store.commit("selection/addNodesToSelection", [nodeWithDialog.id]);
    await Vue.nextTick();
    expect(wrapper.findComponent(NodeDialogLoader).exists()).toBe(false);
  });

  it("should display the proper placeholders", async () => {
    const nodeWithoutDialog = createNode({ id: "1", hasDialog: false });
    const store = createStore({
      nodes: {
        [nodeWithoutDialog.id]: nodeWithoutDialog,
      },
    });
    const wrapper = doShallowMount(store);

    expect(wrapper.find(".placeholder").text()).toMatch("Please select a node");

    store.commit("selection/addNodesToSelection", [nodeWithoutDialog.id]);
    await Vue.nextTick();

    expect(wrapper.find(".placeholder").text()).toMatch(
      "Node dialog cannot be displayed. Please open the configuration from the action bar",
    );
  });
});
