import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { API } from "@api";
import { createTestingPinia } from "@pinia/testing";

import { Button } from "@knime/components";
import FilterCheckIcon from "@knime/styles/img/icons/filter-check.svg";

import { isBrowser, isDesktop } from "@/environment";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { deepMocked } from "@/test/utils";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import SearchResultsInfo from "../SearchResultsInfo.vue";

const mockedAPI = deepMocked(API);

vi.mock("@/environment");

describe("SearchResultsInfo", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({ propsOverrides = {} } = {}) => {
    const props = {
      numFilteredOutNodes: 10,
      isNodeListEmpty: false,
      showDownloadButton: false,
      searchHubLink: "",
      mini: false,
      ...propsOverrides,
    };

    const testingPinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    const uiControlsStore = useUIControlsStore(testingPinia);

    uiControlsStore.shouldDisplayDownloadAPButton = false;
    vi.mocked(uiControlsStore.init).mockImplementation(() => {});

    const wrapper = mount(SearchResultsInfo, {
      props,
      global: {
        stubs: { DownloadAPButton: true },
        plugins: [testingPinia],
      },
    });

    return { wrapper, props, uiControlsStore };
  };

  describe("searchResultsInfo", () => {
    describe("has filtered out nodes", () => {
      it("shows placeholder for empty result if numFilteredOutNodes is a positive value", async () => {
        mockEnvironment("DESKTOP", { isDesktop, isBrowser });
        const { wrapper } = doMount();

        expect(wrapper.text()).toMatch(
          "Change filter settings to “All nodes“ to see more advanced nodes matching your search criteria.",
        );
        await wrapper.findComponent(FilterCheckIcon).trigger("click");
        expect(mockedAPI.desktop.openWebUIPreferencePage).toHaveBeenCalled();
      });

      it("shows download AP button and message for an empty search result", async () => {
        mockEnvironment("BROWSER", { isDesktop, isBrowser });

        const { wrapper, uiControlsStore } = doMount({
          propsOverrides: {
            showDownloadButton: true,
          },
        });

        uiControlsStore.shouldDisplayDownloadAPButton = true;
        await nextTick();

        expect(wrapper.text()).toMatch(
          "There are no available matching nodes. To work with more nodes, download the KNIME Analytics Platform.",
        );
        expect(wrapper.find("download-a-p-button-stub").exists()).toBe(true);
      });
    });

    describe("has empty result", () => {
      it("shows placeholder for empty result if numFilteredOutNodes is 0", () => {
        mockEnvironment("DESKTOP", { isDesktop, isBrowser });
        const query = "xxx xxx";
        const encodedQuery = knimeExternalUrls.KNIME_HUB_SEARCH_URL.replace(
          "%s",
          encodeURIComponent(query),
        );
        const { wrapper } = doMount({
          propsOverrides: {
            numFilteredOutNodes: 0,
            isNodeListEmpty: true,
            searchHubLink: encodedQuery,
          },
        });

        expect(wrapper.text()).toMatch("There are no matching nodes.");
        expect(wrapper.text()).toMatch(
          "Search KNIME Community Hub to find more nodes and extensions.",
        );
        expect(wrapper.findComponent(Button).attributes("href")).toBe(
          encodedQuery,
        );
      });
    });
  });
});
