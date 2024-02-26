import {
  expect,
  describe,
  afterEach,
  it,
  vi,
  beforeAll,
  type Mock,
} from "vitest";
/* eslint-disable new-cap */
import { notifyPatch } from "@/util/event-syncer";
import { deepMocked } from "@/test/utils";

import { API } from "@api";
import {
  ShowToastEvent,
  type EventHandlers,
} from "@/api/gateway-api/generated-api";
import type { DesktopEventHandlers } from "@/api/desktop-api";
import type { SpaceProviderNS } from "@/api/custom-types";

import eventsPlugin from "../events";

vi.mock("@/util/event-syncer");

vi.mock("@/router");

const registeredHandlers: Partial<EventHandlers & DesktopEventHandlers> = {};

const notifyPatchMock = notifyPatch as Mock<Parameters<typeof notifyPatch>>;

const mockedAPI = deepMocked(API);

describe("Event Plugin", () => {
  beforeAll(() => {
    const registerEventHandlers = (handlers) => {
      Object.entries(handlers).forEach(([key, value]) => {
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
    const storeMock = {
      state: {
        application: {},
      },
      dispatch: vi.fn(),
      commit: vi.fn(),
    };

    const routerMock = {
      push: vi.fn(),
    };

    const toastMock = {
      show: vi.fn(),
    };

    eventsPlugin({ $store: storeMock, $router: routerMock, $toast: toastMock });

    return { storeMock, routerMock, toastMock };
  };

  it("fixed Events", () => {
    loadPlugin();
    expect(Object.keys(registeredHandlers)).toStrictEqual([
      "CompositeEvent",
      "WorkflowChangedEvent",
      "ProjectDirtyStateEvent",
      "AppStateChangedEvent",
      "UpdateAvailableEvent",
      "NodeRepositoryLoadingProgressEvent",
      "ShowToastEvent",
      "ProjectDisposedEvent",
      "SaveAndCloseWorkflowsEvent",
      "ImportURIEvent",
      "ProgressEvent",
      "AiAssistantEvent",
      "AiAssistantServerChangedEvent",
      "DesktopAPIFunctionResultEvent",
      "SpaceProvidersChangedEvent",
    ]);
  });

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
      const { storeMock } = loadPlugin();
      registeredHandlers.WorkflowChangedEvent({
        // @ts-expect-error
        patch: { ops: [{ dummy: true, path: "/foo/bar" }] },
      });

      expect(storeMock.dispatch).toHaveBeenCalledWith("workflow/patch.apply", [
        { dummy: true, path: "/activeWorkflow/foo/bar" },
      ]);
    });

    it("should call `notifyPatch` for patches with snapshotId", () => {
      const snapshotId = "1";
      registeredHandlers.WorkflowChangedEvent({
        // @ts-expect-error
        patch: { ops: [{ dummy: true, path: "/foo/bar" }] },
        snapshotId,
      });
      loadPlugin();
      expect(notifyPatch).toHaveBeenCalledWith(snapshotId);
    });

    it("should not call `notifyPatch` for patches without snapshotId", () => {
      loadPlugin();
      registeredHandlers.WorkflowChangedEvent({
        // @ts-expect-error
        patch: { ops: [{ dummy: true, path: "/foo/bar" }] },
      });
      expect(notifyPatch).not.toHaveBeenCalled();
    });

    it("handles ProjectDirtyStateEvent", () => {
      const { storeMock } = loadPlugin();
      const dirtyProjectsMap = { 1: false, 2: false, 3: true };

      registeredHandlers.ProjectDirtyStateEvent({ dirtyProjectsMap });

      expect(storeMock.dispatch).toHaveBeenCalledWith(
        "application/updateDirtyProjectsMap",
        dirtyProjectsMap,
      );

      registeredHandlers.ProjectDirtyStateEvent({
        dirtyProjectsMap,
        shouldReplace: true,
      });

      expect(storeMock.dispatch).toHaveBeenCalledWith(
        "application/setDirtyProjectsMap",
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

      registeredHandlers.CompositeEvent({
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
      it("replaces application state", async () => {
        const { storeMock, routerMock } = loadPlugin();

        await registeredHandlers.AppStateChangedEvent({
          // @ts-expect-error
          appState: { openProjects: [{ id: "mock" }] },
        });

        expect(storeMock.dispatch).toHaveBeenCalledWith(
          "application/replaceApplicationState",
          { openProjects: [{ id: "mock" }] },
        );
        expect(storeMock.dispatch).toHaveBeenCalledWith(
          "application/setActiveProject",
          { $router: routerMock },
        );
      });

      // TODO NXT-1437
      it.todo("should clear the application busy state");
    });

    // TODO NXT-1437
    describe("saveAndCloseWorkflowsEvent", () => {
      it.todo("should set the application busy state");

      it.todo("should generate all unsaved project snapshots");

      it.todo("should call the browser function with the correct parameters");
    });

    describe("updateAvailable event", () => {
      it("replaces availableUpdates state", async () => {
        const { storeMock } = loadPlugin();
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

        await registeredHandlers.UpdateAvailableEvent({
          newReleases,
          bugfixes,
        });

        expect(storeMock.commit).toHaveBeenCalledWith(
          "application/setAvailableUpdates",
          { newReleases, bugfixes },
        );
      });

      it("does not replace availableUpdates state if there are no updates", async () => {
        const { storeMock } = loadPlugin();
        const newReleases = undefined;
        const bugfixes = undefined;

        await registeredHandlers.UpdateAvailableEvent({
          newReleases,
          bugfixes,
        });

        expect(storeMock.commit).not.toHaveBeenCalled();
      });
    });

    describe("spaceProvidersChangedEvent", () => {
      it("should set the loaded space providers (success)", () => {
        const mockProvider: SpaceProviderNS.SpaceProvider = {
          connected: false,
          connectionMode: "AUTOMATIC",
          id: "providerId",
          name: "Mock provider",
        };

        const result = {
          [mockProvider.id]: mockProvider,
        };

        const { storeMock } = loadPlugin();
        registeredHandlers.SpaceProvidersChangedEvent({
          result,
        });

        expect(storeMock.dispatch).toHaveBeenCalledWith(
          "spaces/setAllSpaceProviders",
          result,
        );
      });

      it("should not set the loaded space providers (error)", () => {
        const { storeMock } = loadPlugin();
        registeredHandlers.SpaceProvidersChangedEvent({
          error: "something went wrong",
        });

        expect(storeMock.commit).toBeCalledWith(
          "spaces/setIsLoadingProvider",
          false,
        );

        expect(storeMock.dispatch).not.toHaveBeenCalledWith(
          "spaces/setAllSpaceProviders",
          expect.anything(),
        );
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

        registeredHandlers.ShowToastEvent(toastEvent);

        expect(toastMock.show).toBeCalledWith(toastEvent);
      });
    });
  });
});
