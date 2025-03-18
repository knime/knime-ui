/* eslint-disable new-cap */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import type { DesktopEventHandlers } from "@/api/desktop-api";
import {
  type EventHandlers,
  ShowToastEvent,
  SpaceProvider,
} from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { notifyPatch } from "@/util/event-syncer";
import eventsPlugin from "../events";

vi.mock("@/util/event-syncer");

const registeredHandlers: Partial<EventHandlers & DesktopEventHandlers> = {};

const notifyPatchMock = vi.mocked(notifyPatch);

const mockedAPI = deepMocked(API);

describe("Event Plugin", () => {
  beforeAll(() => {
    const registerEventHandlers = (handlers: any) => {
      Object.entries(handlers).forEach(([key, value]) => {
        // @ts-ignore
        registeredHandlers[key] = value;
      });
    };
    mockedAPI.event.registerEventHandlers.mockImplementation(
      registerEventHandlers,
    );
    mockedAPI.desktop.registerEventHandlers.mockImplementation(
      registerEventHandlers,
    );
  });

  const loadPlugin = () => {
    const routerMock = {
      push: vi.fn(),
    };

    const toastMock = {
      show: vi.fn(),
    };

    const mockedStores = mockStores({ stubActions: true });

    // @ts-ignore
    eventsPlugin({ $router: routerMock, $toast: toastMock });

    return { mockedStores, routerMock, toastMock };
  };

  it("all eventsHandlers are functions", () => {
    loadPlugin();
    Object.values(registeredHandlers).forEach((handler) => {
      expect(typeof handler === "function").toBe(true);
    });
  });

  describe("events", () => {
    afterEach(() => {
      notifyPatchMock.mockClear();
    });

    it("handles WorkflowChangedEvents", () => {
      const { mockedStores } = loadPlugin();
      registeredHandlers.WorkflowChangedEvent!({
        // @ts-expect-error
        patch: { ops: [{ dummy: true, path: "/foo/bar" }] },
      });

      expect(mockedStores.workflowStore["patch.apply"]).toHaveBeenCalledWith([
        { dummy: true, path: "/activeWorkflow/foo/bar" },
      ]);
    });

    it("should call `notifyPatch` for patches with snapshotId", () => {
      const snapshotId = "1";
      registeredHandlers.WorkflowChangedEvent!({
        // @ts-expect-error
        patch: { ops: [{ dummy: true, path: "/foo/bar" }] },
        snapshotId,
      });
      loadPlugin();
      expect(notifyPatch).toHaveBeenCalledWith(snapshotId);
    });

    it("should not call `notifyPatch` for patches without snapshotId", () => {
      loadPlugin();
      registeredHandlers.WorkflowChangedEvent!({
        // @ts-expect-error
        patch: { ops: [{ dummy: true, path: "/foo/bar" }] },
      });
      expect(notifyPatch).not.toHaveBeenCalled();
    });

    it("handles ProjectDirtyStateEvent", () => {
      const { mockedStores } = loadPlugin();
      const dirtyProjectsMap = { 1: false, 2: false, 3: true };

      registeredHandlers.ProjectDirtyStateEvent!({ dirtyProjectsMap });

      expect(
        mockedStores.dirtyProjectsTrackingStore.updateDirtyProjectsMap,
      ).toHaveBeenCalledWith(dirtyProjectsMap);

      registeredHandlers.ProjectDirtyStateEvent!({
        dirtyProjectsMap,
        shouldReplace: true,
      });

      expect(mockedStores.dirtyProjectsTrackingStore.dirtyProjectsMap).toEqual(
        dirtyProjectsMap,
      );
    });

    it("handles CompositeEvents", () => {
      const eventHandlers = new Map();
      const wfcSpy = vi.spyOn(registeredHandlers, "WorkflowChangedEvent");
      const pdsSpy = vi.spyOn(registeredHandlers, "ProjectDirtyStateEvent");
      eventHandlers.set(
        "WorkflowChangedEvent",
        registeredHandlers.WorkflowChangedEvent,
      );
      eventHandlers.set(
        "ProjectDirtyStateEvent",
        registeredHandlers.ProjectDirtyStateEvent,
      );
      const dirtyProjectsMap = { 1: false, 2: false, 3: true };

      registeredHandlers.CompositeEvent!({
        events: ["WorkflowChangedEvent", "ProjectDirtyStateEvent"],
        // @ts-expect-error
        params: [
          { patch: { ops: [{ dummy: true, path: "/foo/bar" }] } },
          { dirtyProjectsMap },
        ],
        eventHandlers,
      });

      expect(wfcSpy).toHaveBeenCalledWith({
        patch: { ops: [{ dummy: true, path: "/activeWorkflow/foo/bar" }] },
      });

      expect(pdsSpy).toHaveBeenCalledWith({ dirtyProjectsMap });
    });

    describe("appState event", () => {
      const providerId = "id1";
      const spaceProviders = [
        {
          id: providerId,
          name: "provider name",
          connected: false,
          connectionMode: SpaceProvider.ConnectionModeEnum.AUTOMATIC,
          type: SpaceProvider.TypeEnum.HUB,
        },
      ];
      const appStateEventPayload = {
        appState: {
          spaceProviders,
        },
      };

      it("sets the space providers and fetches space data", () => {
        const { mockedStores } = loadPlugin();
        vi.mocked(
          mockedStores.spaceProvidersStore.fetchSpaceGroupsForProviders,
        ).mockResolvedValueOnce({ failedProviderNames: [] });

        registeredHandlers.AppStateChangedEvent!(appStateEventPayload);

        expect(
          mockedStores.spaceProvidersStore.setAllSpaceProviders,
        ).toHaveBeenCalledWith(spaceProviders);
        expect(
          mockedStores.spaceProvidersStore.fetchSpaceGroupsForProviders,
        ).toHaveBeenCalledWith(spaceProviders);
      });

      it("shows an error toast if a provider's space groups can't be loaded", async () => {
        const { mockedStores } = loadPlugin();
        vi.mocked(
          mockedStores.spaceProvidersStore.fetchSpaceGroupsForProviders,
        ).mockResolvedValueOnce({
          failedProviderNames: [spaceProviders[0].name],
        });

        registeredHandlers.AppStateChangedEvent!(appStateEventPayload);
        await flushPromises();

        expect(getToastsProvider().show).toHaveBeenCalledWith({
          headline: "Error fetching provider space groups",
          message: "Could not load spaces for:\n- provider name",
          type: "error",
        });
      });

      it("does nothing if there are not space providers supplied", () => {
        const { mockedStores } = loadPlugin();
        registeredHandlers.AppStateChangedEvent!({
          appState: {},
        });
        expect(
          mockedStores.spaceProvidersStore.setAllSpaceProviders,
        ).not.toHaveBeenCalled();
        expect(
          mockedStores.spaceProvidersStore.fetchSpaceGroupsForProviders,
        ).not.toHaveBeenCalled();
      });

      it("replaces application state", () => {
        const { mockedStores, routerMock } = loadPlugin();

        registeredHandlers.AppStateChangedEvent!({
          // @ts-expect-error
          appState: { openProjects: [{ id: "mock" }] },
        });

        expect(
          mockedStores.applicationStore.replaceApplicationState,
        ).toHaveBeenCalledWith({ openProjects: [{ id: "mock" }] });
        expect(
          mockedStores.lifecycleStore.setActiveProject,
        ).toHaveBeenCalledWith({ $router: routerMock });
      });

      // TODO NXT-1437
      it.todo("should clear the application busy state");
    });

    // TODO NXT-1437
    describe("saveAndCloseProjectsEvent", () => {
      it.todo("should set the application busy state");

      it.todo("should generate all unsaved project snapshots");

      it.todo("should call the browser function with the correct parameters");
    });

    describe("updateAvailable event", () => {
      it("replaces availableUpdates state", () => {
        const { mockedStores } = loadPlugin();
        const newReleases = [
          {
            isUpdatePossible: true,
            name: "KNIME Analytics Platform 5.0",
            shortName: "5.0",
          },
          {
            isUpdatePossible: false,
            name: "KNIME Analytics Platform 6.0",
            shortName: "6.0",
          },
        ];
        const bugfixes = ["Update1", "Update2"];

        registeredHandlers.UpdateAvailableEvent!({
          newReleases,
          bugfixes,
        });

        expect(
          mockedStores.applicationStore.setAvailableUpdates,
        ).toHaveBeenCalledWith({ newReleases, bugfixes });
      });

      it("does not replace availableUpdates state if there are no updates", () => {
        const { mockedStores } = loadPlugin();
        const newReleases = undefined;
        const bugfixes = undefined;

        registeredHandlers.UpdateAvailableEvent!({
          newReleases,
          bugfixes,
        });

        expect(
          mockedStores.applicationStore.setAvailableUpdates,
        ).not.toHaveBeenCalled();
      });
    });

    describe("showToastEvent", () => {
      it("should call method show", () => {
        const { toastMock } = loadPlugin();

        const toastEvent = {
          type: ShowToastEvent.TypeEnum.Success,
          autoRemove: true,
          headline: "Brave new toast",
          message: "Some toast in my message",
        };

        registeredHandlers.ShowToastEvent!(toastEvent);

        expect(toastMock.show).toBeCalledWith(toastEvent);
      });
    });
  });
});
