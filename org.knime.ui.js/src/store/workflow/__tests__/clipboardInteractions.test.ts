import {
  afterEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from "vitest";
import { nextTick } from "vue";

import { deepMocked } from "@/test/utils";
import { API } from "@api";
import { pastePartsAt } from "@/util/pasteToWorkflow";

import { loadStore } from "./loadStore";
import { createConnection } from "@/test/factories";

vi.mock("@/util/pasteToWorkflow");

const mockedAPI = deepMocked(API);
const mockedPastePartsAt = pastePartsAt as MockedFunction<typeof pastePartsAt>;

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

    Object.assign(navigator, {
      clipboard: {
        writeText: (text) => {
          clipboardMock.setContent(JSON.parse(text));
        },
        readText: () => {
          const content = clipboardMock.getContent();
          return content ? JSON.stringify(content) : "";
        },
      },
    });

    return clipboardMock;
  };

  it.each([["Copy"], ["Cut"]])("executes <%s> command", async (command) => {
    const stringifiedPayload = JSON.stringify({
      payloadIdentifier: "p-id-1",
      otherData: "is here",
    });

    mockedAPI.workflowCommand[command].mockReturnValue({
      content: stringifiedPayload,
    });

    const clipboardMock = createClipboardMock();
    const { store } = await loadStore();

    store.commit("workflow/setActiveWorkflow", {
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
        {
          id: "root:2_1",
          text: "Test",
          bounds: { x: 10, y: 10, height: 10, width: 10 },
        },
        {
          id: "root:2_2",
          text: "Test1",
          bounds: { x: 20, y: 20, height: 20, width: 20 },
        },
      ],
    });

    store.dispatch("selection/selectAllObjects");
    store.dispatch("selection/selectBendpoints", [
      "connection1__0",
      "connection1__1",
      "connection2__0",
    ]);
    await nextTick();
    await store.dispatch("workflow/copyOrCutWorkflowParts", {
      command: command.toLowerCase(),
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
  });

  describe("executes paste command", () => {
    const setupStoreForPaste = async () => {
      // register "pasteWorkflowParts" API function
      mockedAPI.workflowCommand.Paste.mockReturnValue({
        nodeIds: ["bar"],
        annotationIds: ["root:2_1"],
      });

      const { store } = await loadStore();

      // set up workflow
      const workflow = {
        projectId: "my project",
        info: { containerId: "root" },
        nodes: { foo: { id: "foo" }, bar: { id: "bar" } },
        workflowAnnotations: ["root:2_1", "root:2_2"],
      };
      store.commit("workflow/setActiveWorkflow", workflow);

      // mock current clipboard content
      const clipboardMock = createClipboardMock({
        objectBounds: {
          width: 100,
          height: 100,
        },
        data: "parts",
      });

      // mock strategy result
      const doAfterPasteMock = vi.fn();
      mockedPastePartsAt.mockReturnValue({
        position: { x: 5, y: 5 },
        doAfterPaste: doAfterPasteMock,
      });

      // mock previous copy paste state
      store.commit("workflow/setCopyPaste", {
        dummy: null,
      });

      // Start pasting
      const startPaste = (payload = {}) =>
        store.dispatch("workflow/pasteWorkflowParts", payload);

      return {
        startPaste,
        clipboardMock,
        workflow,
        doAfterPasteMock,
        store,
      };
    };

    it("calls partePartsAt", async () => {
      const { startPaste, clipboardMock } = await setupStoreForPaste();
      await startPaste();

      expect(mockedPastePartsAt).toHaveBeenCalledWith({
        visibleFrame: {
          height: 1000,
          width: 1000,
          left: -500,
          top: -500,
        },
        clipboardContent: clipboardMock.getContent(),
        isWorkflowEmpty: false,
        dispatch: expect.any(Function),
      });
    });

    it("pastes at given position", async () => {
      const { startPaste } = await setupStoreForPaste();
      await startPaste({ position: { x: 100, y: 100 } });

      expect(mockedPastePartsAt).not.toHaveBeenCalled();

      expect(mockedAPI.workflowCommand.Paste).toHaveBeenCalledWith({
        projectId: "my project",
        workflowId: "root",
        content: "parts",
        position: { x: 100, y: 100 },
      });
    });

    it("stores pastes boundary", async () => {
      const { store, startPaste } = await setupStoreForPaste();
      await startPaste();

      expect(store.state.workflow.copyPaste).toStrictEqual({
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
      const { startPaste } = await setupStoreForPaste();
      await startPaste();

      expect(mockedAPI.workflowCommand.Paste).toHaveBeenCalledWith({
        projectId: "my project",
        workflowId: "root",
        content: "parts",
        position: { x: 5, y: 5 },
      });
    });

    it("calls after paste hook", async () => {
      const { startPaste, doAfterPasteMock } = await setupStoreForPaste();
      await startPaste();

      expect(doAfterPasteMock).toHaveBeenCalled();
    });

    it("selects nodes afterwards", async () => {
      const { startPaste, store } = await setupStoreForPaste();
      await startPaste();

      expect(store.state.selection.selectedNodes.foo).toBeFalsy();
      expect(store.state.selection.selectedNodes.bar).toBe(true);
    });
  });
});
