import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, shallowMount } from "@vue/test-utils";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import {
  type Alert,
  USER_ERROR_CODE_BLOCKING,
} from "@knime/ui-extension-renderer/api";
import {
  UIExtension,
  UIExtensionBlockingErrorView,
} from "@knime/ui-extension-renderer/vue";

import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
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
    const mockedStores = mockStores();

    const wrapper = shallowMount(DataValueViewLoader, {
      props: { ...props, ...customProps },
      global: {
        plugins: [mockedStores.testingPinia],
        stubs: { UIExtension: true },
      },
    });

    return { wrapper, mockedStores };
  };

  it("loads data value view on mount", async () => {
    mockGetDataValueView();
    const { wrapper } = doMount();

    await nextTick();

    expect(mockedAPI.port.getDataValueView).toBeCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId: props.nodeId,
      portIdx: props.selectedPortIndex,
      rowIdx: props.selectedRowIndex,
      colIdx: props.selectedColIndex,
    });

    expect(wrapper.findComponent(UIExtension).exists()).toBeFalsy();
    expect(wrapper.findComponent(SkeletonItem).exists()).toBeTruthy();

    await flushPromises();

    expect(wrapper.findComponent(UIExtension).exists()).toBeTruthy();
    expect(wrapper.findComponent(SkeletonItem).exists()).toBeFalsy();
  });

  it("calls API with versionId if versionId is included in props", async () => {
    mockGetDataValueView();
    const versionId = "version-id";
    doMount({ versionId });

    await nextTick();

    expect(mockedAPI.port.getDataValueView).toBeCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId,
      nodeId: props.nodeId,
      portIdx: props.selectedPortIndex,
      rowIdx: props.selectedRowIndex,
      colIdx: props.selectedColIndex,
    });
  });

  it("does not show anything if an error occurs during loading", async () => {
    mockedAPI.port.getDataValueView.mockRejectedValue(new Error("error"));
    const { wrapper } = doMount();

    await flushPromises();

    expect(wrapper.findComponent(UIExtension).exists()).toBe(false);
  });

  it("loads the extension config on try again when it is not defined", async () => {
    mockedAPI.port.getDataValueView
      .mockRejectedValueOnce({
        type: "error",
        code: USER_ERROR_CODE_BLOCKING,
        message: "An error occurred.",
        data: {},
      })
      .mockResolvedValueOnce({
        resourceInfo: {
          type: "SHADOW_APP",
          baseUrl: "baseUrl/",
          path: "path",
        },
      });
    const { wrapper } = doMount();
    await flushPromises();

    const errorView = wrapper.findComponent(UIExtensionBlockingErrorView);
    expect(wrapper.findComponent(UIExtension).exists()).toBeFalsy();
    expect(errorView.exists()).toBeTruthy();

    errorView.vm.$emit("retry");
    await flushPromises();

    expect(wrapper.findComponent(UIExtension).exists()).toBeTruthy();
    expect(errorView.exists()).toBeFalsy();
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

    it("implements sendAlert in apiLayer", async () => {
      mockGetDataValueView();
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const alert: Alert = {
        type: "error",
        message: "message",
        code: USER_ERROR_CODE_BLOCKING,
        data: {},
      };

      apiLayer.sendAlert(alert);

      await nextTick();
      const errorView = wrapper.findComponent(UIExtensionBlockingErrorView);
      expect(errorView.exists()).toBeTruthy();
      expect(errorView.props().alert).toStrictEqual(alert);
    });
  });
});
