import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { Button } from "@knime/components";
import FilterCheckIcon from "@knime/styles/img/icons/filter-check.svg";

import { API } from "@/api";
import { deepMocked, mockVuexStore } from "@/test/utils";
import SearchResultsInfo from "../SearchResultsInfo.vue";

const mockedAPI = deepMocked(API);

describe("SearchResultsInfo", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({
    propsOverrides = {},
    component = SearchResultsInfo,
  } = {}) => {
    const props = {
      numFilteredOutNodes: 10,
      isNodeListEmpty: false,
      showDownloadButton: false,
      searchHubLink: "",
      mini: false,
      ...propsOverrides,
    };

    const $store = mockVuexStore({
      uiControls: {
        state: { shouldDisplayDownloadAPButton: false },
        actions: { init: () => {} },
      },
    });

    const wrapper = mount(component ?? SearchResultsInfo, {
      props,
      global: {
        stubs: { DownloadAPButton: true },
        plugins: [$store],
      },
    });

    return { wrapper, props, $store };
  };

  describe("searchResultsInfo", () => {
    describe("has filtered out nodes", () => {
      it("shows placeholder for empty result if numFilteredOutNodes is a positive value", async () => {
        const { wrapper } = doMount();

        expect(wrapper.text()).toMatch(
          "Change filter settings to “All nodes“ to see more advanced nodes matching your search criteria.",
        );
        await wrapper.findComponent(FilterCheckIcon).trigger("click");
        expect(mockedAPI.desktop.openWebUIPreferencePage).toHaveBeenCalled();
      });

      it("shows download AP button and message for an empty search result", async () => {
        vi.resetModules();
        vi.doMock("@/environment", async (importOriginal) => {
          const actual = await importOriginal<typeof import("@/environment")>();

          return {
            ...actual,
            environment: "BROWSER",
            isDesktop: false,
            isBrowser: true,
          };
        });
        const SearchResultsInfo = (await import("../SearchResultsInfo.vue"))
          .default;

        const { wrapper, $store } = doMount({
          propsOverrides: {
            showDownloadButton: true,
          },
          component: SearchResultsInfo,
        });

        $store.state.uiControls.shouldDisplayDownloadAPButton = true;
        await nextTick();

        expect(wrapper.text()).toMatch(
          "There are no available matching nodes. To work with more nodes, download the KNIME Analytics Platform.",
        );
        expect(wrapper.find("download-a-p-button-stub").exists()).toBe(true);
      });
    });

    describe("has empty result", () => {
      it("shows placeholder for empty result if numFilteredOutNodes is 0", () => {
        const query = "xxx xxx";
        const encodedQuery = `https://hub.knime.com/search?q=${encodeURIComponent(
          query,
        )}&type=all&src=knimeappmodernui`;
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
