import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { createTestingPinia } from "@pinia/testing";

import type { DownloadItem } from "@knime/components";
import { rfcErrors } from "@knime/hub-features";

import { getToastsProvider } from "@/plugins/toasts";
import { useSpaceDownloadsStore } from "../downloads";

const { useDownloadArtifactMock, useAutoCloseOnCompletionMock } = vi.hoisted(
  () => ({
    useDownloadArtifactMock: vi.fn(),
    useAutoCloseOnCompletionMock: vi.fn(),
  }),
);

vi.mock("@knime/hub-features", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useDownloadArtifact: useDownloadArtifactMock,
  };
});

vi.mock("@knime/components", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useAutoCloseOnCompletion: useAutoCloseOnCompletionMock,
  };
});

const defaultDownloadItems: DownloadItem[] = [
  {
    name: "blub",
    downloadId: "some-id",
    status: "READY",
    downloadUrl: "https://some-url.com",
  },
];

describe("downloads", () => {
  const $toast = getToastsProvider();

  const createStore = ({
    downloadItems = [],
  }: {
    downloadItems?: DownloadItem[];
    enableAsyncDownload?: boolean;
  } = {}) => {
    const testingPinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const downloadArtifactMock = {
      start: vi.fn(),
      openDownload: vi.fn(),
      downloadItems: ref(downloadItems),
      cancel: vi.fn(),
      resetState: vi.fn(),
      removeItem: vi.fn(),
    };
    useDownloadArtifactMock.mockReturnValue(downloadArtifactMock);

    const spaceDownloadsStore = useSpaceDownloadsStore(testingPinia);

    return {
      spaceDownloadsStore,
      downloadArtifactMock,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts download", async () => {
    const { spaceDownloadsStore, downloadArtifactMock } = createStore();

    expect(useDownloadArtifactMock).toHaveBeenCalledWith({
      customFetchClientOptions: expect.any(Object),
    });

    await spaceDownloadsStore.startDownload({
      itemId: "some-id",
      version: "current-state",
      name: "some-name",
    });
    expect(downloadArtifactMock.start).toHaveBeenCalledWith({
      itemId: "some-id",
      version: "current-state",
      name: "some-name",
    });
  });

  it("displays error toast on failure for known error format", async () => {
    const { spaceDownloadsStore, downloadArtifactMock } = createStore();

    downloadArtifactMock.start.mockRejectedValue(
      new rfcErrors.RFCError({
        message: "This has never happened before!",
      } as any),
    );

    await spaceDownloadsStore.startDownload({
      itemId: "some-id",
      version: "current-state",
      name: "some-name",
    });
    expect(downloadArtifactMock.start).toHaveBeenCalledWith({
      itemId: "some-id",
      version: "current-state",
      name: "some-name",
    });
    expect($toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        headline: "There was a problem preparing your download",
      }),
    );
  });

  it("logs error to console for unknown error format", async () => {
    consola.mockTypes(() => vi.fn());
    const { spaceDownloadsStore, downloadArtifactMock } = createStore();

    downloadArtifactMock.start.mockRejectedValue(
      new Error("Works on my machine..."),
    );

    await spaceDownloadsStore.startDownload({
      itemId: "some-id",
      version: "current-state",
      name: "some-name",
    });
    expect(downloadArtifactMock.start).toHaveBeenCalledWith({
      itemId: "some-id",
      version: "current-state",
      name: "some-name",
    });
    expect($toast.show).not.toHaveBeenCalled();
    expect(consola.error).toHaveBeenCalled();
  });

  it("hasActiveDownloads is true if download has been started and there are downloadItems", async () => {
    const { spaceDownloadsStore } = createStore({
      downloadItems: defaultDownloadItems,
    });
    expect(spaceDownloadsStore.hasActiveDownload).toBe(false);

    await spaceDownloadsStore.startDownload({
      itemId: "some-id",
      version: "current-state",
      name: "some-name",
    });
    expect(spaceDownloadsStore.hasActiveDownload).toBe(true);
  });

  it("closeDownloadPanel resets state", async () => {
    const { spaceDownloadsStore, downloadArtifactMock } = createStore({
      downloadItems: defaultDownloadItems,
    });
    await spaceDownloadsStore.startDownload({
      itemId: "some-id",
      version: "current-state",
      name: "some-name",
    });
    expect(spaceDownloadsStore.hasActiveDownload).toBe(true);

    spaceDownloadsStore.closeDownloadPanel();
    await nextTick();
    expect(spaceDownloadsStore.hasActiveDownload).toBe(false);
    expect(downloadArtifactMock.resetState).toHaveBeenCalled();
  });

  it("cancels download", () => {
    const { spaceDownloadsStore, downloadArtifactMock } = createStore();
    spaceDownloadsStore.cancel("blub");
    expect(downloadArtifactMock.cancel).toHaveBeenCalledWith("blub");
  });

  it("removes item", () => {
    const { spaceDownloadsStore, downloadArtifactMock } = createStore();
    spaceDownloadsStore.removeItem("blub");
    expect(downloadArtifactMock.removeItem).toHaveBeenCalledWith("blub");
  });

  it("opens download", () => {
    const { spaceDownloadsStore, downloadArtifactMock } = createStore();
    spaceDownloadsStore.openDownload("https://blub.com/my-file");
    expect(downloadArtifactMock.openDownload).toHaveBeenCalledWith(
      "https://blub.com/my-file",
    );
  });

  it("does not open download if url not provided", () => {
    const { spaceDownloadsStore, downloadArtifactMock } = createStore();
    spaceDownloadsStore.openDownload();
    expect(downloadArtifactMock.openDownload).not.toHaveBeenCalled();
  });

  it("hasPendingDownloads returns true if there are downloads in progress", () => {
    const { spaceDownloadsStore } = createStore({
      downloadItems: [
        { name: "filename", downloadId: "some-id", status: "IN_PROGRESS" },
      ],
    });
    expect(spaceDownloadsStore.hasPendingDownloads).toBe(true);
  });

  it("returns downloadItems", () => {
    const { spaceDownloadsStore } = createStore({
      downloadItems: defaultDownloadItems,
    });
    expect(spaceDownloadsStore.downloadItems).toEqual(defaultDownloadItems);
  });

  it("initializes auto-close", () => {
    const { downloadArtifactMock } = createStore();
    expect(useAutoCloseOnCompletionMock).toHaveBeenCalledWith({
      close: expect.any(Function),
      completedStatus: "READY",
      items: downloadArtifactMock.downloadItems,
    });
  });
});
