import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import NodeConfig from "../NodeConfig.vue";
import NodeConfigWrapper from "../NodeConfigWrapper.vue";

describe("NodeConfig", () => {
  const showNonModalDialog = vi.fn();
  const showModal = vi.fn();
  const closeModal = vi.fn();

  beforeAll(() => {
    HTMLDialogElement.prototype.show = showNonModalDialog;
    HTMLDialogElement.prototype.showModal = showModal;
    HTMLDialogElement.prototype.close = closeModal;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = () => {
    const mockedStores = mockStores();
    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        info: {
          name: "fileName",
          containerType: WorkflowInfo.ContainerTypeEnum.Project,
        },
      }),
    );

    const wrapper = mount(NodeConfig, {
      global: {
        stubs: {
          ToastStack: true,
          NodeConfigWrapper: true,
          ManageVersionsWrapper: true,
          IncompatibleNodeConfigPlaceholder: true,
        },
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  const assertLargeModeOpened = () => {
    expect(closeModal).toHaveBeenCalled();
    expect(showNonModalDialog).not.toHaveBeenCalled();
    expect(showModal).toHaveBeenCalled();
  };

  const assertLargeModeClosed = () => {
    expect(closeModal).toHaveBeenCalled();
    expect(showNonModalDialog).toHaveBeenCalled();
    expect(showModal).not.toHaveBeenCalled();
  };

  const setLargeMode = async (
    mockedStores: ReturnType<typeof mockStores>,
    value: boolean,
  ) => {
    mockedStores.nodeConfigurationStore.isLargeMode = value;
    await nextTick();
  };

  it("should toggle large mode when store property changes", async () => {
    const { mockedStores } = doMount();

    await setLargeMode(mockedStores, true);

    assertLargeModeOpened();
    vi.clearAllMocks();

    await setLargeMode(mockedStores, false);

    assertLargeModeClosed();
  });

  it("is toggled to small by pressing escape", async () => {
    const { wrapper, mockedStores } = doMount();

    await setLargeMode(mockedStores, true);

    assertLargeModeOpened();
    vi.clearAllMocks();

    const dialog = wrapper.find("dialog");
    expect(dialog.exists()).toBe(true);
    await dialog.trigger("keydown", { key: "Escape" });
    await nextTick();

    assertLargeModeClosed();
  });

  it("is toggled to small if dialog background is clicked", async () => {
    const { wrapper, mockedStores } = doMount();

    await setLargeMode(mockedStores, true);
    vi.clearAllMocks();

    await wrapper.find("dialog").trigger("click");

    assertLargeModeClosed();
  });

  it("is not toggled to small if dialog area is clicked", async () => {
    const { wrapper, mockedStores } = doMount();

    await setLargeMode(mockedStores, true);
    vi.clearAllMocks();

    await wrapper.findComponent(NodeConfigWrapper).trigger("click");

    expect(closeModal).not.toHaveBeenCalled();
  });
});
