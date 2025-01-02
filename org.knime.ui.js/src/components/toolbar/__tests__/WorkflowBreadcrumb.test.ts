import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import LinkedComponentIcon from "@knime/styles/img/icons/linked-component.svg";
import LinkedMetanodeIcon from "@knime/styles/img/icons/linked-metanode.svg";
import MetaNodeIcon from "@knime/styles/img/icons/metanode.svg";
import ComponentIcon from "@knime/styles/img/icons/node-workflow.svg";

import type { Workflow } from "@/api/custom-types";
import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import { APP_ROUTES } from "@/router/appRoutes";
import { createWorkflow } from "@/test/factories";
import WorkflowBreadcrumb from "../WorkflowBreadcrumb.vue";

describe("WorkflowBreadcrumb.vue", () => {
  type MountOpts = { workflow: Workflow | null };
  const doMount = ({ workflow }: MountOpts) => {
    const $router = { push: vi.fn() };

    const wrapper = shallowMount(WorkflowBreadcrumb, {
      props: { workflow },
      global: { mocks: { $router } },
    });

    return { wrapper };
  };

  it("renders default", () => {
    const { wrapper } = doMount({
      workflow: createWorkflow({
        info: {
          name: "this is a dummy workflow",
        },
      }),
    });

    expect(
      wrapper.findComponent(ActionBreadcrumb).props("items"),
    ).toStrictEqual([
      {
        icon: null,
        text: "this is a dummy workflow",
      },
    ]);
  });

  it("renders nested", () => {
    const workflow = createWorkflow({
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
    });

    const { wrapper } = doMount({ workflow });

    expect(
      wrapper.findComponent(ActionBreadcrumb).props("items"),
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
    it("handles clicks on link", () => {
      const workflow = createWorkflow({
        parents: [],
        info: {
          containerType: "project",
        },
        projectId: "proj",
      });

      const { wrapper } = doMount({ workflow });

      const event = {
        target: {
          tagName: "A",
        },
        id: "root:0:123",
      };
      wrapper.vm.onClick(event);
      expect(wrapper.vm.$router.push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: {
          workflowId: "root:0:123",
          projectId: "proj",
        },
        force: true,
        replace: true,
      });
    });
  });
});
