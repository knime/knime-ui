import { afterEach, describe, expect, it } from "vitest";

import {
  clearStalledPromises,
  notifyPatch,
  waitForPatch,
} from "../event-syncer";

describe("Event Syncer util", () => {
  afterEach(() => {
    clearStalledPromises();
  });

  describe("notifyPatch", () => {
    it("should return nothing if patch arrived first (snapshotId is new)", () => {
      const snapshotId = 1;
      const value = notifyPatch(snapshotId);
      expect(value).toBeUndefined();
    });

    it("should resolve the promise of the waiting command if patch arrived later (snapshotId exists)", async () => {
      const snapshotId = 1;
      let isPromiseResolved = false;

      const promise = waitForPatch(snapshotId);
      promise.then(() => {
        isPromiseResolved = true;
      });

      expect(isPromiseResolved).toBe(false);

      await notifyPatch(2);
      expect(isPromiseResolved).toBe(false);

      await notifyPatch(snapshotId);
      expect(isPromiseResolved).toBe(true);
    });
  });

  describe("waitForPatch", () => {
    it("should create a stalled promise when a patch has not arrived (snapshotId is new)", async () => {
      let isResolved = false;
      const snapshotId = 1;

      const sleep = () => new Promise((r) => setTimeout(r, 1000));

      const promise = waitForPatch(snapshotId).then(() => {
        isResolved = true;
      });

      // simulate waiting for the patch, but race against a sleep promise.
      // can't wait just for the patch because that promise should't resolve if a patch hasn't arrived
      // and so waiting for it would make the test timeout
      await Promise.race([promise, sleep]);
      expect(isResolved).toBe(false);
    });

    it("should resolve automatically when a patch has already arrived (snapshotId exists)", async () => {
      let isResolved = false;
      const snapshotId = 1;
      notifyPatch(snapshotId);
      await waitForPatch(snapshotId).then(() => {
        isResolved = true;
      });

      expect(isResolved).toBe(true);
    });
  });
});
