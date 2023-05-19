import { expect, describe, beforeEach, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";

import ComponentIcon from "webapps-common/ui/assets/img/icons/node-workflow.svg";
import MetaNodeIcon from "webapps-common/ui/assets/img/icons/metanode.svg";
import LinkedComponentIcon from "webapps-common/ui/assets/img/icons/linked-component.svg";
import LinkedMetanodeIcon from "webapps-common/ui/assets/img/icons/linked-metanode.svg";

import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";

import WorkflowBreadcrumb from "../WorkflowBreadcrumb.vue";

describe("WorkflowBreadcrumb.vue", () => {
  let store, workflow, wrapper, doShallowMount, storeConfig;

  beforeEach(() => {
    workflow = null;

    doShallowMount = async () => {
      storeConfig = {
        workflow: {
          state: {
            activeWorkflow: workflow,
          },
          actions: {
            loadWorkflow: vi.fn(),
          },
        },
        application: {
          actions: {
            switchWorkflow: vi.fn(),
          },
        },
      };
      store = mockVuexStore(storeConfig);

      wrapper = await shallowMount(WorkflowBreadcrumb, {
        global: { plugins: [store] },
      });
    };
  });

  it("renders default", async () => {
    workflow = {
      info: {
        name: "this is a dummy workflow",
      },
    };
    await doShallowMount();

    expect(
      wrapper.findComponent(ActionBreadcrumb).props("items")
    ).toStrictEqual([
      {
        icon: null,
        text: "this is a dummy workflow",
      },
    ]);
  });

  it("renders nested", async () => {
    workflow = {
      info: {
        name: "this is a dummy workflow",
        linked: true,
      },
      parents: [
        {
          containerType: "project",
          name: "foo",
        },
        {
          containerType: "component",
          containerId: "root:p1",
          name: "Comp oh Nent",
        },
        {
          containerType: "component",
          containerId: "root:p2",
          name: "L ink Comp oh Nent",
          linked: true,
        },
        {
          containerType: "metanode",
          containerId: "root:p3",
          name: "Matter Node",
        },
        {
          containerType: "metanode",
          containerId: "root:p4",
          name: "Latter Node",
          linked: true,
        },
      ],
    };
    await doShallowMount();

    expect(
      wrapper.findComponent(ActionBreadcrumb).props("items")
    ).toStrictEqual([
      {
        id: "root",
        icon: null,
        text: "foo",
      },
      {
        id: "root:p1",
        icon: ComponentIcon,
        text: "Comp oh Nent",
      },
      {
        id: "root:p2",
        icon: LinkedComponentIcon,
        text: "L ink Comp oh Nent",
      },
      {
        id: "root:p3",
        icon: MetaNodeIcon,
        text: "Matter Node",
      },
      {
        id: "root:p4",
        icon: LinkedMetanodeIcon,
        text: "Latter Node",
      },
      {
        icon: null,
        text: "this is a dummy workflow",
      },
    ]);
  });

  describe("event handling", () => {
    // unfortunately, event simulation in vue-test-utils is pretty crappy, especially in combination with
    // nested components and nuxt-links. So we call the event handler directly.

    beforeEach(async () => {
      workflow = {
        parents: [],
        info: {
          containerType: "project",
        },
        projectId: "proj",
      };
      await doShallowMount();
    });

    it("handles clicks on link", () => {
      const event = {
        target: {
          tagName: "A",
        },
        id: "root:0:123",
      };
      wrapper.vm.onClick(event);
      expect(
        storeConfig.application.actions.switchWorkflow
      ).toHaveBeenCalledWith(expect.anything(), {
        newWorkflow: {
          workflowId: "root:0:123",
          projectId: "proj",
        },
      });
    });
  });
});
