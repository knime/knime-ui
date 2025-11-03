import { describe, expect, it } from "vitest";
import type { FederatedPointerEvent } from "pixi.js";

import { isMarkedEvent, markPointerEventAsHandled } from "../interaction";

describe("interaction utils", () => {
  describe("markPointerEventAsHandled", () => {
    it("should mark a DOM PointerEvent as handled", () => {
      const nativeEvent = new PointerEvent("pointerdown");
      const dataset = {
        initiator: "text-editing" as const,
      };

      markPointerEventAsHandled(nativeEvent, dataset);

      expect(nativeEvent.dataset).toEqual({
        initiator: "text-editing",
        skipGlobalSelection: true,
      });
    });

    it("mark a FederatedPointerEvent as handled", () => {
      const nativeEvent = new PointerEvent("pointerdown");
      const federatedEvent = {
        nativeEvent,
      } as FederatedPointerEvent;

      const dataset = {
        initiator: "object-interaction" as const,
      };

      markPointerEventAsHandled(federatedEvent, dataset);

      expect(nativeEvent.dataset).toEqual({
        initiator: "object-interaction",
        skipGlobalSelection: true,
      });
    });

    it("should override the skipGlobalSelection default", () => {
      const nativeEvent = new PointerEvent("pointerdown");
      const dataset = {
        initiator: "object-interaction" as const,
        skipGlobalSelection: false,
      };

      markPointerEventAsHandled(nativeEvent, dataset);

      expect(nativeEvent.dataset).toEqual({
        initiator: "object-interaction",
        skipGlobalSelection: false,
      });
    });

    it("should distinguish between DOM PointerEvent and FederatedPointerEvent", () => {
      const domEvent = new PointerEvent("pointerdown");
      const federatedNativeEvent = new PointerEvent("pointerdown");
      const federatedEvent = {
        nativeEvent: federatedNativeEvent,
      } as FederatedPointerEvent;

      const dataset = {
        initiator: "object-interaction" as const,
        skipGlobalSelection: true,
      };

      // Test DOM event
      markPointerEventAsHandled(domEvent, dataset);
      expect(domEvent.dataset).toEqual(dataset);

      // Test Federated event
      markPointerEventAsHandled(federatedEvent, dataset);
      expect(federatedNativeEvent.dataset).toEqual(dataset);
      expect(federatedEvent.nativeEvent.dataset).toEqual(dataset);
    });
  });

  describe("isMarkedEvent", () => {
    it("should detect marked event (PointerEvent)", () => {
      const pointerEvent = new PointerEvent("pointerdown");

      expect(isMarkedEvent(pointerEvent)).toBe(false);

      markPointerEventAsHandled(pointerEvent, { initiator: "action-button" });
      expect(isMarkedEvent(pointerEvent)).toBe(true);

      expect(isMarkedEvent(pointerEvent, "add-port-placeholder")).toBe(false);
      expect(isMarkedEvent(pointerEvent, "action-button")).toBe(true);
    });

    it("should detect marked event (FederatedPointerEvent)", () => {
      const pointerEvent = new PointerEvent("pointerdown");
      const federatedEvent = {
        nativeEvent: pointerEvent,
      } as FederatedPointerEvent;

      expect(isMarkedEvent(federatedEvent)).toBe(false);

      markPointerEventAsHandled(federatedEvent, { initiator: "action-button" });
      expect(isMarkedEvent(federatedEvent)).toBe(true);

      expect(isMarkedEvent(federatedEvent, "add-port-placeholder")).toBe(false);
      expect(isMarkedEvent(federatedEvent, "action-button")).toBe(true);
    });
  });
});
