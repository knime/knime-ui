import { afterEach, describe, expect, it } from "vitest";
import { VueWrapper, flushPromises, shallowMount } from "@vue/test-utils";

import { UIExtension } from "@knime/ui-extension-renderer";

import { API } from "@/api";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import * as applicationStore from "@/store/application";
import { deepMocked, mockVuexStore } from "@/test/utils";
import DataValueViewLoader, { type Props } from "../DataValueViewLoader.vue";

const mockedAPI = deepMocked(API);

describe("DataValueViewLoader.vue", () => {
  const props: Props = {
    projectId: "project-id",
    workflowId: "workflow-id",
    nodeId: "node1",
    selectedPortIndex: 0,
    selectedColIndex: 0,
    selectedRowIndex: 0,
  };

  afterEach(() => {
    mockedAPI.port.getDataValueView.mockReset();
  });

  const mockGetDataValueView = (additionalMocks?: object) => {
    mockedAPI.port.getDataValueView.mockResolvedValue({
      resourceInfo: {
        type: "SHADOW_APP",
        baseUrl: "baseUrl/",
        path: "path",
      },
      ...additionalMocks,
    });
  };

  const doMount = (customProps = {}) => {
    const $store = mockVuexStore({
      application: applicationStore,
    });

    const wrapper = shallowMount(DataValueViewLoader, {
      props: { ...props, ...customProps },
      global: { plugins: [$store], stubs: { UIExtension: true } },
    });

    return { wrapper, $store };
  };

  it("loads data value view on mount", async () => {
    mockGetDataValueView();
    const { wrapper } = doMount();

    expect(mockedAPI.port.getDataValueView).toBeCalledWith(
      expect.objectContaining({
        projectId: props.projectId,
        workflowId: props.workflowId,
        nodeId: props.nodeId,
        portIdx: props.selectedPortIndex,
        rowIdx: props.selectedRowIndex,
        colIdx: props.selectedColIndex,
      }),
    );
    expect(wrapper.findComponent(UIExtension).exists()).toBe(false);
    expect(wrapper.findComponent(SkeletonItem).exists()).toBeTruthy();

    await flushPromises();

    expect(wrapper.findComponent(UIExtension).exists()).toBe(true);
    expect(wrapper.findComponent(SkeletonItem).exists()).toBeFalsy();
  });

  it("does not show anything if an error occurs during loading", async () => {
    mockedAPI.port.getDataValueView.mockRejectedValue(new Error("error"));
    const { wrapper } = doMount();

    await flushPromises();

    expect(wrapper.findComponent(UIExtension).exists()).toBe(false);
  });

  describe("apiLayer", () => {
    const getApiLayer = (wrapper: VueWrapper<any>) => {
      const uiExtension = wrapper.findComponent(UIExtension);
      return uiExtension.props("apiLayer");
    };

    it("implements getResourceLocation in apiLayer", async () => {
      mockGetDataValueView();
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe("baseUrl/path1");
    });
  });
});
