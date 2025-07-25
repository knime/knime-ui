import { describe, expect, it } from "vitest";
import type { FederatedPointerEvent } from "pixi.js";

import { markPointerEventAsHandled } from "../interaction";

describe("interaction utils", () => {
  describe("markPointerEventAsHandled", () => {
    it("should mark a DOM PointerEvent as handled", () => {
      const nativeEvent = new PointerEvent("pointerdown");
      const dataset = {
        initiator: "text-editing",
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
        initiator: "node-interaction",
      };

      markPointerEventAsHandled(federatedEvent, dataset);

      expect(nativeEvent.dataset).toEqual({
        initiator: "node-interaction",
        skipGlobalSelection: true,
      });
    });

    it("should override the skipGlobalSelection default", () => {
      const nativeEvent = new PointerEvent("pointerdown");
      const dataset = {
        initiator: "test-initiator",
        skipGlobalSelection: false,
      };

      markPointerEventAsHandled(nativeEvent, dataset);

      expect(nativeEvent.dataset).toEqual({
        initiator: "test-initiator",
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
        initiator: "type-test",
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
});
