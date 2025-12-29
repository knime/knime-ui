import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import {
  centerStrategy,
  offsetStrategy,
  pastePartsAt,
  pasteURI,
} from "@/util/pasteToWorkflow";

describe("pasteToWorkflow", () => {
  const mockedAPI = deepMocked(API);

  const randomSpy = vi.spyOn(Math, "random").mockImplementation(() => 0);

  beforeEach(randomSpy.mockClear);

  const mockClipboardContent = {
    objectBounds: {
      left: 0,
      top: 0,
      width: 10,
      height: 10,
    },
  };

  const mockVisibleFrame = {
    left: 0,
    top: 0,
    width: 1000,
    height: 1000,
  };

  describe("center strategy", () => {
    it("returns a position with offset", () => {
      const position = centerStrategy({
        clipboardContent: mockClipboardContent,
        visibleFrame: mockVisibleFrame,
      });
      expect(randomSpy).toBeCalledTimes(2);
      expect(position.x).toBe(470);
      expect(position.y).toBe(345);
    });
  });

  describe("offset strategy", () => {
    it("returns a position with offset", () => {
      const position = offsetStrategy({
        clipboardContent: mockClipboardContent,
        visibleFrame: mockVisibleFrame,
      });
      expect(position?.x).toBeGreaterThan(0);
      expect(position?.y).toBeGreaterThan(0);
    });

    it("returns null when paste is outside of frame", () => {
      const position = offsetStrategy({
        clipboardContent: mockClipboardContent,
        visibleFrame: { ...mockVisibleFrame, width: 5, height: 5 },
      });
      expect(position).toBeNull();
    });
  });

  describe("pastePartsAt", () => {
    it("uses center strategy when workflow is empty", () => {
      const paste = pastePartsAt({
        visibleFrame: mockVisibleFrame,
        clipboardContent: mockClipboardContent,
        isWorkflowEmpty: true,
      });
      expect(paste.position.x).toBe(470);
      expect(paste.position.y).toBe(345);
    });

    it("uses offset strategy first", () => {
      const paste = pastePartsAt({
        visibleFrame: mockVisibleFrame,
        clipboardContent: mockClipboardContent,
        isWorkflowEmpty: false,
      });
      expect(paste.position.x).toBe(95);
      expect(paste.position.y).toBe(95);
    });

    it("uses center strategy when paste is not visible", () => {
      const paste = pastePartsAt({
        visibleFrame: mockVisibleFrame,
        clipboardContent: {
          objectBounds: {
            ...mockClipboardContent.objectBounds,
            left: 3000,
            top: 3000,
          },
        },
        isWorkflowEmpty: false,
      });
      expect(paste.position.x).toBe(470);
      expect(paste.position.y).toBe(345);
    });
  });

  describe("pasteURI", () => {
    const uri = "test://uri";
    const mockWorkflow = createWorkflow();

    it("calls importURIAtWorkflowCanvas with adjusted position when position is provided", () => {
      const position = { x: 100, y: 200 };

      pasteURI(uri, mockWorkflow, position, mockVisibleFrame);

      expect(mockedAPI.desktop.importURIAtWorkflowCanvas).toHaveBeenCalledWith({
        uri,
        projectId: mockWorkflow.projectId,
        workflowId: mockWorkflow.info.containerId,
        x: 84,
        y: 184,
      });
    });

    it("calls importURIAtWorkflowCanvas with center strategy position when position is null", () => {
      const position = null;

      // @ts-expect-error tests
      pasteURI(uri, mockWorkflow, position, mockVisibleFrame);

      expect(mockedAPI.desktop.importURIAtWorkflowCanvas).toHaveBeenCalledWith({
        uri,
        projectId: mockWorkflow.projectId,
        workflowId: mockWorkflow.info.containerId,
        x: 459,
        y: 334,
      });
    });

    it("calls importURIAtWorkflowCanvas with center strategy position when position is undefined", () => {
      const position = undefined;

      // @ts-expect-error tests
      pasteURI(uri, mockWorkflow, position, mockVisibleFrame);

      expect(mockedAPI.desktop.importURIAtWorkflowCanvas).toHaveBeenCalledWith({
        uri,
        projectId: mockWorkflow.projectId,
        workflowId: mockWorkflow.info.containerId,
        x: 459,
        y: 334,
      });
    });
  });
});
