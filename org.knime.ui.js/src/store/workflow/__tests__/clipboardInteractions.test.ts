import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { clipboard } from "@/lib/workflow-canvas";
import { getToastsProvider } from "@/plugins/toasts";
import {
  createConnection,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

vi.mock("@/lib/workflow-canvas", async () => ({
  ...(await vi.importActual("@/lib/workflow-canvas")),
  clipboard: {
    determinePastePosition: vi.fn(),
    defaultPastePosition: vi.fn(() => ({ x: 100, y: 100 })),
  },
}));

const mockedAPI = deepMocked(API);
const determinePastePositionMock = vi.mocked(clipboard.determinePastePosition);

describe("workflow::clipboardInteractions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const createClipboardMock = (initialContent = {}) => {
    const clipboardMock = (function (_initialContent) {
      let clipboardContent = _initialContent;

      return {
        setContent(newContent) {
          clipboardContent = newContent;
        },
        getContent() {
          return clipboardContent;
        },
      };
    })(initialContent);

    const writeTextMock = vi.fn((text) => {
      clipboardMock.setContent(JSON.parse(text));
    });
    const readTextMock = vi.fn(() => {
      const content = clipboardMock.getContent();
      return content ? JSON.stringify(content) : "";
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
        readText: readTextMock,
      },
    });

    return { clipboardMock, writeTextMock, readTextMock };
  };

  it.each([["Copy"], ["Cut"]] as const)(
    "executes <%s> command",
    async (command: "Copy" | "Cut") => {
      const stringifiedPayload = JSON.stringify({
        payloadIdentifier: "p-id-1",
        otherData: "is here",
      });

      mockedAPI.workflowCommand[command].mockResolvedValue({
        content: stringifiedPayload,
      });

      const { clipboardMock } = createClipboardMock();
      const { workflowStore, selectionStore, clipboardInteractionsStore } =
        mockStores();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "my project",
          info: { containerId: "root" },
          nodes: {
            foo: {
              id: "foo",
              position: { x: 0, y: 0 },
            },
            bar: {
              id: "bar",
              position: { x: 50, y: 50 },
            },
          },
          connections: {
            connection1: createConnection({
              bendpoints: [
                { x: 10, y: 10 },
                { x: 20, y: 20 },
              ],
            }),
            connection2: createConnection({
              bendpoints: [{ x: 10, y: 10 }],
            }),
          },
          workflowAnnotations: [
            createWorkflowAnnotation({
              id: "root:2_1",
              text: { value: "Test" },
              bounds: { x: 10, y: 10, height: 10, width: 10 },
            }),
            createWorkflowAnnotation({
              id: "root:2_2",
              text: { value: "Test1" },
              bounds: { x: 20, y: 20, height: 20, width: 20 },
            }),
          ],
        }),
      );

      selectionStore.selectAllObjects();
      selectionStore.selectBendpoints([
        "connection1__0",
        "connection1__1",
        "connection2__0",
      ]);
      await nextTick();

      await clipboardInteractionsStore.copyOrCutWorkflowParts({
        command: command.toLowerCase() as "cut" | "copy",
      });

      expect(mockedAPI.workflowCommand[command]).toHaveBeenCalledWith({
        projectId: "my project",
        workflowId: "root",
        nodeIds: ["foo", "bar"],
        annotationIds: ["root:2_1", "root:2_2"],
        connectionBendpoints: {
          connection1: [0, 1],
          connection2: [0],
        },
      });

      expect(clipboardMock.getContent()).toStrictEqual({
        payloadIdentifier: "p-id-1",
        projectId: "my project",
        workflowId: "root",
        data: stringifiedPayload,
        objectBounds: {
          left: 0,
          top: 0,
          right: 50 + 32,
          bottom: 50 + 32,
          width: 50 + 32,
          height: 50 + 32,
        },
      });
    },
  );

  it("executes alternative copy method for webkit browsers", async () => {
    const toast = getToastsProvider();
    const stringifiedPayload = JSON.stringify({
      payloadIdentifier: "p-id-1",
      otherData: "is here",
    });

    mockedAPI.workflowCommand.Copy.mockResolvedValue({
      content: stringifiedPayload,
    });

    const { clipboardMock } = createClipboardMock();
    navigator.clipboard.writeText
      // @ts-expect-error
      .mockImplementationOnce((text) => {
        clipboardMock.setContent(JSON.parse(text));
      })
      .mockImplementationOnce(() => {
        const error = new Error();
        error.name = "NotAllowedError";
        throw error;
      });

    const { workflowStore, selectionStore, clipboardInteractionsStore } =
      mockStores();

    workflowStore.setActiveWorkflow(
      createWorkflow({
        projectId: "my project",
        info: { containerId: "root" },
        nodes: {
          foo: {
            id: "foo",
            position: { x: 0, y: 0 },
          },
          bar: {
            id: "bar",
            position: { x: 50, y: 50 },
          },
        },
        connections: {
          connection1: createConnection({
            bendpoints: [
              { x: 10, y: 10 },
              { x: 20, y: 20 },
            ],
          }),
          connection2: createConnection({
            bendpoints: [{ x: 10, y: 10 }],
          }),
        },
        workflowAnnotations: [
          createWorkflowAnnotation({
            id: "root:2_1",
            text: { value: "Test" },
            bounds: { x: 10, y: 10, height: 10, width: 10 },
          }),
          createWorkflowAnnotation({
            id: "root:2_2",
            text: { value: "Test1" },
            bounds: { x: 20, y: 20, height: 20, width: 20 },
          }),
        ],
      }),
    );

    selectionStore.selectAllObjects();
    selectionStore.selectBendpoints([
      "connection1__0",
      "connection1__1",
      "connection2__0",
    ]);
    await flushPromises();
    await nextTick();

    await clipboardInteractionsStore.copyOrCutWorkflowParts({
      command: "copy",
    });

    expect(mockedAPI.workflowCommand.Copy).toHaveBeenCalledWith({
      projectId: "my project",
      workflowId: "root",
      nodeIds: ["foo", "bar"],
      annotationIds: ["root:2_1", "root:2_2"],
      connectionBendpoints: {
        connection1: [0, 1],
        connection2: [0],
      },
    });

    expect(clipboardMock.getContent()).toStrictEqual({
      cacheClipboardContentId: "clipboard_cache_3",
    });

    // toast
    expect(toast.show).toHaveBeenCalledOnce();
  });

  describe("executes paste command", () => {
    const setupStoreForPaste = (
      cacheClipboardContentId: string | null = null,
    ) => {
      // register "pasteWorkflowParts" API function
      mockedAPI.workflowCommand.Paste.mockReturnValue({
        nodeIds: ["bar"],
        annotationIds: ["root:2_1"],
      });

      const {
        workflowStore,
        clipboardInteractionsStore,
        selectionStore,
        canvasStore,
      } = mockStores();

      // @ts-expect-error mock pinia getter
      canvasStore.getVisibleFrame = {
        left: -500,
        top: -500,
        width: 1000,
        height: 1000,
      };

      // set up workflow
      const workflow = createWorkflow({
        projectId: "my project",
        info: { containerId: "root" },
        nodes: { foo: { id: "foo" }, bar: { id: "bar" } },
        workflowAnnotations: [
          createWorkflowAnnotation({ id: "root:2_1" }),
          createWorkflowAnnotation({ id: "root:2_2" }),
        ],
      });

      workflowStore.setActiveWorkflow(workflow);

      // mock current clipboard content
      const { clipboardMock, readTextMock } = createClipboardMock(
        cacheClipboardContentId
          ? { cacheClipboardContentId }
          : {
              objectBounds: {
                width: 100,
                height: 100,
              },
              data: "parts",
            },
      );

      // mock strategy result
      const doAfterPasteMock = vi.fn();
      determinePastePositionMock.mockReturnValue({
        position: { x: 5, y: 5 },
      });

      // mock previous copy paste state
      clipboardInteractionsStore.setCopyPaste({
        // @ts-expect-error
        dummy: null,
      });

      // Start pasting
      const startPaste = (payload = {}) =>
        clipboardInteractionsStore.pasteWorkflowParts(payload);

      return {
        startPaste,
        clipboardMock,
        workflow,
        readTextMock,
        doAfterPasteMock,
        clipboardInteractionsStore,
        selectionStore,
        canvasStore,
      };
    };

    it("calls function to get past content position", async () => {
      const { startPaste, clipboardMock } = setupStoreForPaste();

      await startPaste();

      expect(determinePastePositionMock).toHaveBeenCalledWith({
        visibleFrame: {
          height: 1000,
          width: 1000,
          left: -500,
          top: -500,
        },
        clipboardContent: clipboardMock.getContent(),
        isWorkflowEmpty: false,
      });
    });

    it("uses clipboard cache if content has cacheId", async () => {
      const cacheClipboardContentId = "clipboard_id_1";
      const { startPaste, clipboardInteractionsStore } = setupStoreForPaste(
        cacheClipboardContentId,
      );

      clipboardInteractionsStore.setClipboardContentCache({
        cacheClipboardContentId,
        clipboardContent: JSON.stringify({
          objectBounds: {
            width: 100,
            height: 100,
          },
          data: "cached_parts",
        }),
      });
      await startPaste();

      expect(mockedAPI.workflowCommand.Paste).toHaveBeenCalledWith({
        projectId: "my project",
        workflowId: "root",
        content: "cached_parts",
        position: { x: 5, y: 5 },
      });
    });

    it("pastes at given position", async () => {
      const { startPaste } = setupStoreForPaste();
      await startPaste({ position: { x: 100, y: 100 } });

      expect(determinePastePositionMock).not.toHaveBeenCalled();

      expect(mockedAPI.workflowCommand.Paste).toHaveBeenCalledWith({
        projectId: "my project",
        workflowId: "root",
        content: "parts",
        position: { x: 100, y: 100 },
      });
    });

    it("stores pastes boundary", async () => {
      const { clipboardInteractionsStore, startPaste } = setupStoreForPaste();
      await startPaste();

      expect(clipboardInteractionsStore.copyPaste).toStrictEqual({
        dummy: null,
        lastPasteBounds: {
          left: 5,
          top: 5,
          width: 100,
          height: 100,
        },
      });
    });

    it("calls paste API function", async () => {
      const { startPaste } = setupStoreForPaste();
      await startPaste();

      expect(mockedAPI.workflowCommand.Paste).toHaveBeenCalledWith({
        projectId: "my project",
        workflowId: "root",
        content: "parts",
        position: { x: 5, y: 5 },
      });
    });

    it("selects nodes afterwards", async () => {
      const { startPaste, selectionStore } = await setupStoreForPaste();
      await startPaste();

      expect(selectionStore.selectedNodeIds.includes("foo")).toBeFalsy();
      expect(selectionStore.selectedNodeIds.includes("bar")).toBeTruthy();
    });

    it("parses clipboard content as URI instead of JSON", async () => {
      const { startPaste, clipboardMock, readTextMock } = setupStoreForPaste();

      readTextMock.mockImplementation(() => "uri://foo-bar");

      clipboardMock.setContent("asdasd");
      await startPaste();

      expect(mockedAPI.desktop.importURIAtWorkflowCanvas).toHaveBeenCalledWith({
        projectId: "my project",
        uri: "uri://foo-bar",
        workflowId: "root",
        x: 100,
        y: 100,
      });

      expect(mockedAPI.workflowCommand.Paste).not.toHaveBeenCalled();
    });
  });
});
