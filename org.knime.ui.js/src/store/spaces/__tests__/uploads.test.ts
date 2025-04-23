import { afterEach, describe, expect, it, vi } from "vitest";
import { type UnwrapRef, reactive, readonly, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useFileDialog } from "@vueuse/core";

import { rfcErrors, useFileUpload } from "@knime/hub-features";

import type { DestinationPickerResult } from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { getToastsProvider } from "@/plugins/toasts";
import { mockStores } from "@/test/utils/mockStores";

type UploadItems = UnwrapRef<ReturnType<typeof useFileUpload>["uploadItems"]>;

type CallbackNames = "onUploadQueueSizeExceeded";
const useFileUploadFeatureMockCallbacks = {
  callbacks: new Map<CallbackNames, (...args: any[]) => void>(),
  register(name: CallbackNames, fn: (...args: any[]) => void) {
    this.callbacks.set(name, fn);
  },
  trigger(name: CallbackNames, args: any[]) {
    this.callbacks.get(name)?.(...args);
  },
};

const useFileUploadFeatureMock = {
  uploadItems: ref<UploadItems>([]),
  start: vi.fn(),
  cancel: vi.fn(),
  resetState: vi.fn(),
  removeItem: vi.fn(),
  setProcessingCompleted: vi.fn(),
  setProcessingFailed: vi.fn(),
  unprocessedUploads: readonly(reactive(new Set())),
};

vi.mock("@knime/hub-features", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,

    useFileUpload: (options) => {
      const { onUploadQueueSizeExceeded } = options;
      if (onUploadQueueSizeExceeded) {
        useFileUploadFeatureMockCallbacks.register(
          "onUploadQueueSizeExceeded",
          onUploadQueueSizeExceeded,
        );
      }

      return useFileUploadFeatureMock;
    },
  };
});

const { useSubscribeToUploadEventsMock, useAutoCloseOnCompletionMock } =
  vi.hoisted(() => ({
    useSubscribeToUploadEventsMock: vi.fn(),
    useAutoCloseOnCompletionMock: vi.fn(),
  }));

vi.mock("@knime/components", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useAutoCloseOnCompletion: useAutoCloseOnCompletionMock,
  };
});

vi.mock("~/composables/useSubscribeToUploadEvents", () => ({
  useSubscribeToUploadEvents: useSubscribeToUploadEventsMock,
}));

let activeOnChangeCallback: (files: FileList) => void;
const onFilesChangeMock = (cb) => {
  activeOnChangeCallback = cb;
};
const open = vi.fn();

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useFileDialog: vi.fn(() => ({
      open,
      reset: vi.fn(),
      onChange: onFilesChangeMock,
    })),
  };
});

vi.mock("@/components/spaces/DestinationPicker/useDestinationPicker", () => {
  return {
    useDestinationPicker: () => ({
      presets: {
        UPLOAD_PICKERCONFIG: {},
        DOWNLOAD_PICKERCONFIG: {},
      },
      promptDestination: vi.fn().mockResolvedValue({
        type: "item",
        spaceProviderId: "mockDestinationSpaceProviderId",
        spaceId: "mockDestinationSpaceId",
        itemId: "mockDestinationItemId",
        resetWorkflow: true,
        isWorkflowContainer: true,
      } satisfies DestinationPickerResult),
    }),
  };
});

describe("space::uploads", () => {
  const parentId = "space:1";
  const file1 = new File(["hello"], "hello.txt", { type: "text/plain" });
  const file2 = new File(["world"], "world.txt", { type: "text/plain" });
  const $toast = getToastsProvider();

  const mockUploadItems: UploadItems = [
    {
      id: "1",
      name: "hello.txt",
      progress: 0,
      size: file1.size,
      status: "inprogress",
      parentId,
    },
    {
      id: "2",
      name: "world.txt",
      progress: 0,
      size: file1.size,
      status: "inprogress",
      parentId,
    },
  ];

  const projectId = "project1";

  const setupStore = () => {
    const mockedStores = mockStores();

    mockedStores.applicationStore.setActiveProjectId("project1");
    mockedStores.spaceCachingStore.setProjectPath({
      projectId,
      value: {
        spaceProviderId: "provider1",
        spaceId: "space1",
        itemId: "root",
      },
    });

    return { ...mockedStores };
  };

  const triggerFileSelection = () => {
    activeOnChangeCallback([file1, file2] as unknown as FileList);
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should indicate when an upload is active", () => {
    const { spaceUploadsStore } = setupStore();
    expect(spaceUploadsStore.hasActiveUpload).toBe(false);
    spaceUploadsStore.startUpload();
    expect(spaceUploadsStore.hasActiveUpload).toBe(false);
    useFileUploadFeatureMock.uploadItems.value = mockUploadItems;
    expect(spaceUploadsStore.hasActiveUpload).toBe(true);
  });

  it("should start upload (for root path)", async () => {
    const { spaceUploadsStore } = setupStore();

    spaceUploadsStore.startUpload();

    expect(open).toHaveBeenCalled();
    expect(vi.mocked(useFileDialog)).toHaveBeenCalled();
    triggerFileSelection();

    await flushPromises();
    expect(useFileUploadFeatureMock.start).toHaveBeenCalledWith("space1", [
      file1,
      file2,
    ]);
  });

  it("should start upload (for non-root path)", async () => {
    const { spaceUploadsStore, spaceCachingStore } = setupStore();

    spaceCachingStore.setProjectPath({
      projectId,
      value: {
        spaceProviderId: "provider1",
        spaceId: "space1",
        itemId: "itemX",
      },
    });

    spaceUploadsStore.startUpload();
    triggerFileSelection();

    await flushPromises();
    expect(useFileUploadFeatureMock.start).toHaveBeenCalledWith("itemX", [
      file1,
      file2,
    ]);
  });

  it("should allow closing the uploads panel", () => {
    const { spaceUploadsStore } = setupStore();
    spaceUploadsStore.startUpload();
    useFileUploadFeatureMock.uploadItems.value = mockUploadItems;
    expect(spaceUploadsStore.hasActiveUpload).toBe(true);
    spaceUploadsStore.closeUploadsPanel();
    expect(spaceUploadsStore.hasActiveUpload).toBe(false);
    expect(useFileUploadFeatureMock.resetState).toHaveBeenCalled();
  });

  it("should cancel an upload", () => {
    const { spaceUploadsStore } = setupStore();
    spaceUploadsStore.cancelUpload(parentId);
    expect(useFileUploadFeatureMock.cancel).toHaveBeenCalledWith(parentId);
  });

  it("should remove an item from the uploads", () => {
    const { spaceUploadsStore } = setupStore();
    spaceUploadsStore.removeItem(parentId);
    expect(useFileUploadFeatureMock.removeItem).toHaveBeenCalledWith(parentId);
  });

  it("should show toast when upload queue size is exceeded", () => {
    setupStore();

    useFileUploadFeatureMockCallbacks.trigger("onUploadQueueSizeExceeded", [8]);

    expect($toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        headline: "Max concurrent uploads reached",
        message: expect.stringMatching(/8/),
      }),
    );
  });

  it("should show toast when preparing an upload fails", async () => {
    const { spaceUploadsStore } = setupStore();

    const mockError = new rfcErrors.RFCError({
      title: "Some issue",
      date: new Date(),
      requestId: "request-id",
      status: 400,
    });
    useFileUploadFeatureMock.start.mockRejectedValueOnce(mockError);

    spaceUploadsStore.startUpload();
    triggerFileSelection();
    await flushPromises();

    expect($toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        headline: "There was a problem preparing your upload",
      }),
    );

    const toastTemplateComponent = (
      vi.mocked($toast.show).mock.calls.at(0)!.at(0)! as any
    ).component;

    expect(toastTemplateComponent.props).toEqual(
      expect.objectContaining({
        headline: "There was a problem preparing your upload",
        ...mockError.data,
      	canCopyToClipboard: true,
      }),
    );
  });

  it("initializes auto-close", () => {
    setupStore();
    expect(useAutoCloseOnCompletionMock).toHaveBeenCalledWith({
      close: expect.any(Function),
      completedStatus: "complete",
      items: useFileUploadFeatureMock.uploadItems,
    });
  });
});
