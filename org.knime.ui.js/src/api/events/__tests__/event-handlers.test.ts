import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ref } from "vue";
import { API } from "@api";
import type { Router } from "vue-router";

import type { ToastService } from "@knime/components";

import type { DesktopEventHandlers } from "@/api/desktop-api";
import { notifyPatch } from "@/api/events/event-syncer";
import {
  type EventHandlers,
  ShowToastEvent,
  SpaceProvider,
} from "@/api/gateway-api/generated-api";
import { isBrowser, isDesktop } from "@/environment";
import { APP_ROUTES } from "@/router/appRoutes";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import { initializeEventHandlers } from "../event-handlers";

vi.mock("@/environment");
vi.mock("../event-syncer");

const registeredHandlers: Partial<EventHandlers & DesktopEventHandlers> = {};

const notifyPatchMock = vi.mocked(notifyPatch);

const mockedAPI = deepMocked(API);

describe("Event Plugin", () => {
  beforeAll(() => {
    const registerEventHandlers = (handlers: any) => {
      Object.entries(handlers).forEach(([key, value]) => {
        // @ts-expect-error
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

  const setup = () => {
    const currentRouteMock = ref({
      name: "",
      params: {} as Record<string, string>,
    });
    const routerMock = {
      push: vi.fn(),
      currentRoute: currentRouteMock,
    } as unknown as Router;

    const toastMock = {
      show: vi.fn(),
    } as unknown as ToastService;

    const mockedStores = mockStores({ stubActions: true });

    initializeEventHandlers(routerMock, toastMock);

    return { mockedStores, routerMock, toastMock, currentRouteMock };
  };

  it("all eventsHandlers are functions", () => {
    setup();
    Object.values(registeredHandlers).forEach((handler) => {
      expect(typeof handler === "function").toBe(true);
    });
  });

  beforeEach(() => {
    mockEnvironment("DESKTOP", { isBrowser, isDesktop });
  });

  afterEach(() => {
    notifyPatchMock.mockClear();
  });

  it("handles WorkflowChangedEvents", () => {
    const { mockedStores } = setup();
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
    setup();
    expect(notifyPatch).toHaveBeenCalledWith(snapshotId);
  });

  it("should not call `notifyPatch` for patches without snapshotId", () => {
    setup();
    registeredHandlers.WorkflowChangedEvent!({
      // @ts-expect-error
      patch: { ops: [{ dummy: true, path: "/foo/bar" }] },
    });
    expect(notifyPatch).not.toHaveBeenCalled();
  });

  it("handles ProjectDirtyStateEvent", () => {
    const { mockedStores } = setup();
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
    describe("provider updates", () => {
      const provider1 = createSpaceProvider({
        id: "hub1",
        type: SpaceProvider.TypeEnum.HUB,
      });

      const provider2 = createSpaceProvider({
        id: "hub2",
        type: SpaceProvider.TypeEnum.HUB,
      });

      it("adds or removes providers based on event payload", () => {
        const { mockedStores, routerMock } = setup();

        mockedStores.spaceProvidersStore.spaceProviders = {
          [provider1.id]: provider1,
        };

        const appStateEventPayload = {
          appState: { spaceProviders: [provider2 as SpaceProvider] },
        };

        expect(
          mockedStores.spaceProvidersStore.spaceProviders[provider1.id],
        ).toBeDefined();

        registeredHandlers.AppStateChangedEvent!(appStateEventPayload);

        expect(
          mockedStores.spaceProvidersStore.spaceProviders[provider1.id],
        ).toBeUndefined();

        expect(
          mockedStores.spaceProvidersStore.spaceProviders[provider2.id],
        ).toEqual({ ...provider2, spaceGroups: [] });

        expect(routerMock.push).not.toHaveBeenCalled();
      });

      it("does not modify existing providers", () => {
        const { mockedStores } = setup();

        const spaceGroups = [createSpaceGroup({ spaces: [createSpace()] })];
        const providerInState = createSpaceProvider({
          id: "hub1",
          type: SpaceProvider.TypeEnum.HUB,
          spaceGroups,
        });

        mockedStores.spaceProvidersStore.spaceProviders = {
          [providerInState.id]: providerInState,
        };

        const appStateEventPayload = {
          appState: {
            spaceProviders: [
              // send the same existing provider, but without spaces
              createSpaceProvider({ id: providerInState.id }) as SpaceProvider,
              provider2 as SpaceProvider,
            ],
          },
        };

        registeredHandlers.AppStateChangedEvent!(appStateEventPayload);

        expect(
          mockedStores.spaceProvidersStore.spaceProviders[providerInState.id]
            .spaceGroups,
        ).toEqual(spaceGroups);
      });

      it("navigates to get-started page if provider is removed", () => {
        const { mockedStores, currentRouteMock, routerMock } = setup();

        mockedStores.spaceProvidersStore.spaceProviders = {
          [provider1.id]: provider1,
        };
        currentRouteMock.value.name = APP_ROUTES.Home.SpaceBrowsingPage;
        currentRouteMock.value.params.spaceProviderId = provider1.id;

        const appStateEventPayload = {
          appState: { spaceProviders: [provider2 as SpaceProvider] },
        };

        registeredHandlers.AppStateChangedEvent!(appStateEventPayload);

        expect(routerMock.push).toHaveBeenCalledWith({
          name: APP_ROUTES.Home.GetStarted,
        });
      });
    });

    it("replaces application state", () => {
      const { mockedStores, routerMock } = setup();

      registeredHandlers.AppStateChangedEvent!({
        // @ts-expect-error
        appState: { openProjects: [{ id: "mock" }] },
      });

      expect(
        mockedStores.applicationStore.replaceApplicationState,
      ).toHaveBeenCalledWith({ openProjects: [{ id: "mock" }] });
      expect(mockedStores.lifecycleStore.setActiveProject).toHaveBeenCalledWith(
        { $router: routerMock },
      );
    });

    it("does nothing if app state is empty", () => {
      const { mockedStores } = setup();
      registeredHandlers.AppStateChangedEvent!({
        appState: {},
      });
      expect(
        mockedStores.applicationStore.replaceApplicationState,
      ).not.toHaveBeenCalled();
    });

    it("does not call setActiveProject when there's a pending workflow navigation", () => {
      const { mockedStores } = setup();

      mockedStores.lifecycleStore.pendingWorkflowNavigation = {
        projectId: "foo",
        workflowId: "bar",
      };

      registeredHandlers.AppStateChangedEvent!({
        // @ts-expect-error
        appState: { openProjects: [{ id: "mock" }] },
      });

      expect(
        mockedStores.applicationStore.replaceApplicationState,
      ).toHaveBeenCalledWith({ openProjects: [{ id: "mock" }] });
      expect(
        mockedStores.lifecycleStore.setActiveProject,
      ).not.toHaveBeenCalled();
    });

    it("does not call setActiveProject on the browser", () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
      const { mockedStores } = setup();

      mockedStores.lifecycleStore.pendingWorkflowNavigation = {
        projectId: "foo",
        workflowId: "bar",
      };

      registeredHandlers.AppStateChangedEvent!({
        // @ts-expect-error
        appState: { openProjects: [{ id: "mock" }] },
      });

      expect(
        mockedStores.applicationStore.replaceApplicationState,
      ).toHaveBeenCalledWith({ openProjects: [{ id: "mock" }] });
      expect(
        mockedStores.lifecycleStore.setActiveProject,
      ).not.toHaveBeenCalled();
    });

    // TODO NXT-1437
    it.todo("should clear the application busy state");
  });

  describe("updateAvailable event", () => {
    it("replaces availableUpdates state", () => {
      const { mockedStores } = setup();
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
      const { mockedStores } = setup();
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
      const { toastMock } = setup();

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
