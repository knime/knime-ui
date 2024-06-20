import { expect, describe, it, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { deepMocked } from "@/test/utils";

import { API } from "@api";
import FilterCheckIcon from "webapps-common/ui/assets/img/icons/filter-check.svg";
import SearchResultsInfo from "../SearchResultsInfo.vue";
import Button from "webapps-common/ui/components/Button.vue";

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

    const wrapper = mount(component ?? SearchResultsInfo, {
      props,
      global: {
        stubs: {
          DownloadAPButton: true,
        },
      },
    });

    return { wrapper, props };
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

      it("shows download AP button and message for an empty search result in the browser", async () => {
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

        const { wrapper } = doMount({
          propsOverrides: {
            showDownloadButton: true,
          },
          component: SearchResultsInfo,
        });

        expect(wrapper.find("download-a-p-button-stub").exists()).toBe(true);
        expect(wrapper.text()).toMatch(
          "There are no available matching nodes. To work with more nodes, download the KNIME Analytics Platform.",
        );
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

      it("shows download button in browser", async () => {
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

        const { wrapper } = doMount({
          propsOverrides: {
            numFilteredOutNodes: 0,
            isNodeListEmpty: true,
          },
          component: SearchResultsInfo,
        });

        expect(wrapper.text()).toMatch(
          "There are more open source extensions and nodes available in the full version of the KNIME Analytics Platform.",
        );
      });
    });
  });
});
