import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";

import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import type { ExtensionConfig } from "../types";
import { useUIExtensionLifecycle } from "../useUIExtensionLifecycle";

describe("useUIExtensionLifecycle", () => {
  type MountOpts = Partial<Parameters<typeof useUIExtensionLifecycle>[0]>;

  const doMount = (options: MountOpts = {}) => {
    const mockedStores = mockStores();

    const configLoader =
      options.configLoader ??
      (() => {
        const extensionConfig = {
          resourceInfo: {
            type: "SHADOW_APP",
            baseUrl: "baseUrl/",
            path: "path",
          },
        } as ExtensionConfig;

        return Promise.resolve({
          extensionConfig,
          deactivateDataServices: undefined,
        });
      });

    const result = mountComposable({
      composable: useUIExtensionLifecycle,
      composableProps: {
        renderKey: options.renderKey ?? ref(""),
        configLoader,
        onExtensionLoadingStateChange:
          options.onExtensionLoadingStateChange ?? (() => {}),
        onBeforeLoadUIExtension: options.onBeforeLoadUIExtension ?? (() => {}),
      },
      mockedStores,
    });

    return { ...result, mockedStores };
  };

  it("should load UI Extension config when renderKey changes", async () => {
    const mockUIExtensionConfig = {
      resourceInfo: {
        type: "SHADOW_APP",
        baseUrl: "baseUrl/",
        path: "path",
      },
    };

    const deactivateDataServices = vi.fn();
    const configLoader = vi
      .fn()
      .mockResolvedValueOnce({
        extensionConfig: mockUIExtensionConfig,
        deactivateDataServices,
      })
      .mockResolvedValue({
        extensionConfig: { ...mockUIExtensionConfig, afterUpdate: "baz" },
        deactivateDataServices,
      });

    const renderKey = ref("foo");

    const { getComposableResult } = doMount({ renderKey, configLoader });
    await flushPromises();

    expect(configLoader).toHaveBeenCalledOnce();
    expect(deactivateDataServices).not.toHaveBeenCalled();

    const { extensionConfig } = getComposableResult();
    expect(extensionConfig.value).toEqual(mockUIExtensionConfig);

    // trigger change
    renderKey.value = "bar";

    await flushPromises();
    expect(configLoader).toHaveBeenCalledTimes(2);
    expect(deactivateDataServices).toHaveBeenCalledOnce();
    expect(extensionConfig.value).toEqual({
      ...mockUIExtensionConfig,
      afterUpdate: "baz",
    });
  });

  it("should call deactivate dataservices during unmount", async () => {
    const mockUIExtensionConfig = {
      resourceInfo: {
        type: "SHADOW_APP",
        baseUrl: "baseUrl/",
        path: "path",
      },
    };

    const deactivateDataServices = vi.fn();
    const configLoader = vi.fn().mockResolvedValue({
      extensionConfig: mockUIExtensionConfig,
      deactivateDataServices,
    });

    const { lifeCycle } = doMount({ configLoader });
    await flushPromises();

    expect(configLoader).toHaveBeenCalledOnce();
    expect(deactivateDataServices).not.toHaveBeenCalled();

    lifeCycle.unmount();
    expect(deactivateDataServices).toHaveBeenCalled();
  });

  it("should call deactivate dataservices only if config loader returns it", async () => {
    const mockUIExtensionConfig = {
      resourceInfo: {
        type: "SHADOW_APP",
        baseUrl: "baseUrl/",
        path: "path",
      },
    };

    const deactivateDataServices = vi.fn();

    // mock a config loader that first returns a deactivation function
    // but not after subsequent calls
    const configLoader = vi
      .fn()
      .mockResolvedValueOnce({
        extensionConfig: mockUIExtensionConfig,
        deactivateDataServices,
      })
      .mockResolvedValue({ extensionConfig: mockUIExtensionConfig });

    const renderKey = ref("initial");
    doMount({ renderKey, configLoader });

    // make sure that deactivation function was called always only once.
    // That is, the one from the first configLoader call

    await flushPromises();
    expect(configLoader).toHaveBeenCalledTimes(1);
    expect(deactivateDataServices).not.toHaveBeenCalled();

    renderKey.value = "change1";

    await flushPromises();
    expect(configLoader).toHaveBeenCalledTimes(2);
    expect(deactivateDataServices).toHaveBeenCalledOnce();

    renderKey.value = "change2";

    await flushPromises();
    expect(configLoader).toHaveBeenCalledTimes(3);
    expect(deactivateDataServices).toHaveBeenCalledOnce();
  });

  it("should trigger onBeforeLoad callback", async () => {
    const mockUIExtensionConfig = {
      resourceInfo: {
        type: "SHADOW_APP",
        baseUrl: "baseUrl/",
        path: "path",
      },
    };

    const deactivateDataServices = vi.fn();
    const configLoader = vi.fn().mockResolvedValue({
      extensionConfig: mockUIExtensionConfig,
      deactivateDataServices,
    });

    const onBeforeLoadUIExtension = vi.fn();
    const renderKey = ref("foo");

    doMount({ renderKey, configLoader, onBeforeLoadUIExtension });

    await flushPromises();
    expect(onBeforeLoadUIExtension).toHaveBeenCalledTimes(1);

    // trigger change
    renderKey.value = "bar";

    await flushPromises();
    expect(onBeforeLoadUIExtension).toHaveBeenCalledTimes(2);
  });

  it("should trigger loading state change callback", async () => {
    const mockUIExtensionConfig = {
      resourceInfo: {
        type: "SHADOW_APP",
        baseUrl: "baseUrl/",
        path: "path",
      },
    };

    const deactivateDataServices = vi.fn();
    const configLoader = vi.fn().mockResolvedValue({
      extensionConfig: mockUIExtensionConfig,
      deactivateDataServices,
    });

    const onExtensionLoadingStateChange = vi.fn();
    doMount({ configLoader, onExtensionLoadingStateChange });

    await flushPromises();
    expect(onExtensionLoadingStateChange).toHaveBeenCalledTimes(2);
    expect(onExtensionLoadingStateChange).toHaveBeenNthCalledWith(1, {
      value: "loading",
      message: "Loading data",
    });
    expect(onExtensionLoadingStateChange).toHaveBeenNthCalledWith(2, {
      value: "ready",
    });
  });

  it("should call loading state callback with error if loading UI extension fails", async () => {
    const error = new Error("extension config error");
    const configLoader = vi.fn().mockRejectedValue(error);

    const onExtensionLoadingStateChange = vi.fn();

    doMount({ configLoader, onExtensionLoadingStateChange });

    await flushPromises();
    expect(onExtensionLoadingStateChange).toHaveBeenCalledTimes(2);
    expect(onExtensionLoadingStateChange).toHaveBeenNthCalledWith(1, {
      value: "loading",
      message: "Loading data",
    });

    expect(onExtensionLoadingStateChange).toHaveBeenNthCalledWith(2, {
      value: "error",
      error,
      message: error.message,
    });
  });
});
