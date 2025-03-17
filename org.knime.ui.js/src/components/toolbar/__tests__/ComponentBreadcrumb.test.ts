import { describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { useRouter } from "vue-router";

import LinkedComponentIcon from "@knime/styles/img/icons/linked-component.svg";
import LinkedMetanodeIcon from "@knime/styles/img/icons/linked-metanode.svg";
import MetaNodeIcon from "@knime/styles/img/icons/metanode.svg";
import ComponentIcon from "@knime/styles/img/icons/node-workflow.svg";

import type { Workflow } from "@/api/custom-types";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import { APP_ROUTES } from "@/router/appRoutes";
import { createWorkflow } from "@/test/factories";
import ComponentBreadcrumb from "../ComponentBreadcrumb.vue";

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    useRouter: vi.fn(() => ({ push: routerPush })),
    useRoute: vi.fn(() => ({ meta: {} })),
  };
});

describe("ComponentBreadcrumb.vue", () => {
  type MountOpts = { workflow: Workflow };
  const doMount = ({ workflow }: MountOpts) => {
    const $router = { push: routerPush };

    const wrapper = shallowMount(ComponentBreadcrumb, {
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
        icon: undefined,
        id: "root",
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
          containerType: WorkflowInfo.ContainerTypeEnum.Project,
          name: "foo",
        },
        {
          containerType: WorkflowInfo.ContainerTypeEnum.Component,
          containerId: "root:p1",
          name: "Comp oh Nent",
        },
        {
          containerType: WorkflowInfo.ContainerTypeEnum.Component,
          containerId: "root:p2",
          name: "L ink Comp oh Nent",
          linked: true,
        },
        {
          containerType: WorkflowInfo.ContainerTypeEnum.Metanode,
          containerId: "root:p3",
          name: "Matter Node",
        },
        {
          containerType: WorkflowInfo.ContainerTypeEnum.Metanode,
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
        icon: undefined,
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
        icon: undefined,
        id: "root",
        text: "this is a dummy workflow",
      },
    ]);
  });

  describe("event handling", () => {
    it("handles clicks on link", () => {
      const workflow = createWorkflow({
        parents: [],
        info: {
          containerType: WorkflowInfo.ContainerTypeEnum.Project,
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
      expect(useRouter().push).toHaveBeenCalledWith({
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
