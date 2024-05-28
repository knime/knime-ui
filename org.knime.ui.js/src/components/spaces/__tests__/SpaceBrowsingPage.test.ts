import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockVuexStore, deepMocked } from "@/test/utils";

import * as spacesStore from "@/store/spaces";
import * as applicationStore from "@/store/application";

import { globalSpaceBrowserProjectId } from "@/store/spaces";

import { API } from "@api";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { SpaceProviderNS } from "@/api/custom-types";
import { SpaceItem } from "@/api/gateway-api/generated-api";
import SpacePageLayout from "../SpacePageLayout.vue";
import FileExplorer from "webapps-common/ui/components/FileExplorer/FileExplorer.vue";

const mockedAPI = deepMocked(API);
mockedAPI.desktop.importWorkflows.mockResolvedValue([]);
mockedAPI.desktop.importFiles.mockResolvedValue([]);

const mockSpaceItems: SpaceItem[] = [
  {
    id: "1",
    name: "Folder 1",
    type: SpaceItem.TypeEnum.WorkflowGroup,
  },
  {
    id: "2",
    name: "Folder 2",
    type: SpaceItem.TypeEnum.WorkflowGroup,
  },
  {
    id: "3",
    name: "File 3",
    type: SpaceItem.TypeEnum.Workflow,
  },
  {
    id: "4",
    name: "File 3",
    type: SpaceItem.TypeEnum.Data,
  },
];

mockedAPI.space.listWorkflowGroup.mockResolvedValue({
  items: mockSpaceItems,
  path: [],
});

vi.mock("webapps-common/ui/services/toast");

describe("SpaceBrowsingPage.vue", () => {
  const spaceGroup = createSpaceGroup({
    id: "group1",
    spaces: [
      createSpace({ id: "space1", name: "SPACE 1" }),
      createSpace({ id: "space2", name: "SPACE 2" }),
      createSpace({ id: "space3", name: "SPACE 3" }),
    ],
  });

  const spaceProvider = createSpaceProvider({
    id: "provider1",
    name: "Some hub space",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: [spaceGroup],
  });

  const doMount = async ({ initialStoreState = {} } = {}) => {
    vi.doMock("vue-router", () => ({
      useRouter: vi.fn(() => ({ push: () => {} })),
      useRoute: vi.fn(() => ({
        params: {
          spaceProviderId: spaceProvider.id,
          groupId: spaceGroup.id,
          spaceId: spaceGroup.spaces.at(0)!.id,
        },
      })),
    }));

    const $store = mockVuexStore({
      spaces: spacesStore,
      application: applicationStore,
    });

    $store.commit("spaces/setSpaceProviders", {
      [spaceProvider.id]: spaceProvider,
    });

    $store.state.spaces = {
      ...$store.state.spaces,
      ...{
        projectPath: {
          [globalSpaceBrowserProjectId]: {
            spaceId: "local",
            spaceProviderId: "local",
            itemId: "root",
          },
        },
      },
      ...initialStoreState,
    };

    const SpaceBrowsingPage = (await import("../SpaceBrowsingPage.vue"))
      .default;

    const wrapper = mount(SpaceBrowsingPage, {
      global: {
        plugins: [$store],
        mocks: { $shortcuts: { get: vi.fn(() => ({})) } },
      },
    });

    return { wrapper, $store };
  };

  it("should render correctly", async () => {
    const { wrapper } = await doMount();

    await flushPromises();

    expect(wrapper.findComponent(SpacePageLayout).props("title")).toBe(
      spaceGroup.spaces.at(0)!.name,
    );

    expect(wrapper.findComponent(FileExplorer).props("items")).toEqual(
      mockSpaceItems.map((item) => expect.objectContaining(item)),
    );
  });

  it("should display breadcrumbs", async () => {
    const { wrapper } = await doMount();

    expect(wrapper.findComponent(SpacePageLayout).props("breadcrumbs")).toEqual(
      [
        expect.objectContaining({ text: spaceProvider.name }),
        expect.objectContaining({ text: spaceGroup.name }),
        expect.objectContaining({ text: spaceGroup.spaces.at(0)!.name }),
      ],
    );
  });
});
