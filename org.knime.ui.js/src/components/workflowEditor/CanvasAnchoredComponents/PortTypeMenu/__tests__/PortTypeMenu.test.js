import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { MenuItems, SearchInput } from "@knime/components";

import FloatingMenu from "@/components/workflowEditor/SVGKanvas/FloatingMenu/FloatingMenu.vue";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { mockStores } from "@/test/utils/mockStores";
import PortTypeMenu from "../PortTypeMenu.vue";

describe("PortTypeMenu.vue", () => {
  const doMount = ({ props } = {}) => {
    const defaultProps = {
      position: {
        x: 10,
        y: 10,
      },
      side: "output",
      portGroups: null,
    };

    const FloatingMenuStub = {
      template: "<div><slot /></div>",
      props: FloatingMenu.props,
    };

    const mockedStores = mockStores();
    mockedStores.applicationStore.availablePortTypes = {
      flowVariable: { name: "Flow Variable", color: "red" },
      table: { name: "Table", color: "black" },
      "suggested-1": { name: "Suggested 1", color: "green" },
      "suggested-2": { name: "Suggested 2", color: "brown" },
    };
    mockedStores.applicationStore.suggestedPortTypes = [
      "suggested-1",
      "suggested-2",
    ];

    // attachTo document body so that focus works
    const wrapper = mount(PortTypeMenu, {
      props: { ...defaultProps, ...props },
      attachTo: document.body,
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shapes, $colors },
        stubs: {
          FloatingMenu: FloatingMenuStub,
        },
      },
    });

    return { wrapper, FloatingMenuStub, mockedStores };
  };

  describe("menu", () => {
    it("re-emits menu-close", () => {
      const { wrapper, FloatingMenuStub } = doMount();

      wrapper.findComponent(FloatingMenuStub).vm.$emit("menuClose");
      expect(wrapper.emitted("menuClose")).toBeTruthy();
    });

    describe("header", () => {
      it("sets up header for output ports", () => {
        const { wrapper } = doMount();

        let header = wrapper.find(".header");
        expect(header.classes()).toContain("output");
        expect(header.attributes("style")).toMatch("--margin: 10px");
        expect(header.text()).toBe("Add Output Port");
      });

      it("sets up header for input ports", () => {
        const { wrapper } = doMount({ props: { side: "input" } });

        let header = wrapper.find(".header");
        expect(header.classes()).toContain("input");
        expect(header.attributes("style")).toMatch("--margin: 10px");
        expect(header.text()).toBe("Add Input Port");
      });

      it("moves header for bigger zoom levels", async () => {
        const { wrapper, mockedStores } = doMount();

        mockedStores.canvasStore.zoomFactor = 2;
        await nextTick();

        let header = wrapper.find(".header");
        expect(header.attributes("style")).toMatch(
          "--margin: 16.669910139330234px",
        );
      });

      it("doesnt move header for smaller zoom levels", async () => {
        const { wrapper, mockedStores } = doMount();

        mockedStores.canvasStore.zoomFactor = 0.5;
        await nextTick();

        let header = wrapper.find(".header");
        expect(header.attributes("style")).toMatch(
          "--margin: 6.1691425974866565px",
        );
      });
    });

    describe("menu position", () => {
      it("100% zoom and output", () => {
        const { wrapper, FloatingMenuStub } = doMount();

        let floatingMenu = wrapper.findComponent(FloatingMenuStub);
        expect(floatingMenu.props("anchor")).toBe("top-left");
        expect(floatingMenu.props("canvasPosition")).toStrictEqual({
          x: 10,
          y: 10,
        });
      });

      it("100% zoom and input", () => {
        const { wrapper, FloatingMenuStub } = doMount({
          props: { side: "input" },
        });

        let floatingMenu = wrapper.findComponent(FloatingMenuStub);
        expect(floatingMenu.props("anchor")).toBe("top-right");
        expect(floatingMenu.props("canvasPosition")).toStrictEqual({
          x: 10,
          y: 10,
        });
      });

      it("50% zoom, no vertical shift", async () => {
        const { wrapper, mockedStores, FloatingMenuStub } = doMount();

        mockedStores.canvasStore.zoomFactor = 0.5;
        await nextTick();

        let floatingMenu = wrapper.findComponent(FloatingMenuStub);
        expect(floatingMenu.props("canvasPosition")).toStrictEqual({
          x: 10,
          y: 10,
        });
      });

      it("200% zoom, vertical shift", async () => {
        const { wrapper, mockedStores, FloatingMenuStub } = doMount();

        mockedStores.canvasStore.zoomFactor = 2;
        await nextTick();

        let floatingMenu = wrapper.findComponent(FloatingMenuStub);
        expect(floatingMenu.props("canvasPosition")).toStrictEqual({
          x: 10,
          y: 12.599301927099795,
        });
      });
    });

    describe("search input", () => {
      it("focus search input on mount", () => {
        const { wrapper } = doMount();

        let searchInput = wrapper
          .findComponent(SearchInput)
          .find("input").element;
        expect(document.activeElement).toStrictEqual(searchInput);
      });

      it.each([
        ["ArrowDown", "suggested-1"],
        ["ArrowUp", "table"],
      ])("keyboard navigation: %s", async (code, expectedTypeId) => {
        const { wrapper } = doMount();

        const searchInput = wrapper.findComponent(SearchInput);
        searchInput.vm.$emit("keydown", new KeyboardEvent("keydown", { code }));
        await nextTick();

        expect(
          searchInput.find("input").attributes("aria-activedescendant"),
        ).toBeDefined();
        expect(wrapper.emitted("itemActive").at(-1)[0]).toEqual(
          expect.objectContaining({
            port: { typeId: expectedTypeId },
          }),
        );
      });
    });

    describe("specific Port Groups -> only some types allowed)", () => {
      it.each([["input"], ["output"]])(
        "should display the port groups in the menu so that the user selects one first (%s ports)",
        (side) => {
          const canAddPort =
            side === "input" ? "canAddInPort" : "canAddOutPort";
          const portGroups = {
            group1: {
              supportedPortTypeIds: ["table", "flowVariable"],
              [canAddPort]: true,
            },
            group2: {
              supportedPortTypeIds: ["table", "flowVariable"],
              [canAddPort]: true,
            },
          };

          const { wrapper } = doMount({ props: { portGroups, side } });

          expect(wrapper.findComponent(MenuItems).props("items")).toEqual(
            Object.keys(portGroups).map((key) => ({ text: key })),
          );
        },
      );

      it("should automatically select the port group when only 1 is given", () => {
        const portGroups = {
          group1: {
            supportedPortTypeIds: ["table", "flowVariable"],
            canAddInPort: true,
          },
          group2: {
            supportedPortTypeIds: ["table", "flowVariable"],
            canAddOutPort: true,
          },
        };

        const { wrapper } = doMount({ props: { portGroups } });

        expect(wrapper.findComponent(MenuItems).props("items")).toStrictEqual([
          {
            icon: expect.anything(),
            port: { typeId: "flowVariable" },
            text: "Flow Variable",
            title: null,
          },
          {
            icon: expect.anything(),
            port: { typeId: "table" },
            text: "Table",
            title: null,
          },
        ]);
      });

      it("should display the available ports in the group after the group has been selected", async () => {
        const portGroups = {
          group1: {
            supportedPortTypeIds: ["table", "flowVariable"],
            canAddOutPort: true,
          },
          group2: {
            supportedPortTypeIds: ["table", "flowVariable"],
            canAddOutPort: true,
          },
        };

        const { wrapper } = doMount({ props: { portGroups } });

        // select a group
        wrapper
          .findComponent(MenuItems)
          .vm.$emit("item-click", {}, { text: "group1" });
        await nextTick();

        expect(wrapper.findComponent(MenuItems).props("items")).toStrictEqual([
          {
            icon: expect.anything(),
            port: { typeId: "flowVariable" },
            text: "Flow Variable",
            title: null,
          },
          {
            icon: expect.anything(),
            port: { typeId: "table" },
            text: "Table",
            title: null,
          },
        ]);
      });

      it("should not display the search bar when displaying the port groups", () => {
        const portGroups = {
          group1: {
            supportedPortTypeIds: ["table", "flowVariable"],
            canAddOutPort: true,
          },
          group2: {
            supportedPortTypeIds: ["table", "flowVariable"],
            canAddOutPort: true,
          },
        };

        const { wrapper } = doMount({ props: { portGroups } });
        expect(wrapper.findComponent(SearchInput).exists()).toBe(false);
      });

      it('should unselect the port group when clicking on the "back" button', async () => {
        const portGroups = {
          group1: {
            supportedPortTypeIds: ["table", "flowVariable"],
            canAddOutPort: true,
          },
          group2: {
            supportedPortTypeIds: ["table", "flowVariable"],
            canAddOutPort: true,
          },
        };

        const { wrapper } = doMount({ props: { portGroups } });

        // select a group
        wrapper
          .findComponent(MenuItems)
          .vm.$emit("item-click", {}, { text: "group1" });
        await nextTick();

        // go back
        wrapper.find(".return-button").trigger("click");
        await nextTick();

        expect(wrapper.findComponent(MenuItems).props("items")).toEqual([
          { text: "group1" },
          { text: "group2" },
        ]);
      });

      it("should automatically select the port if it's the only one inside the selected group", async () => {
        const portGroups = {
          group1: { supportedPortTypeIds: ["table"], canAddOutPort: true },
          group2: {
            supportedPortTypeIds: ["flowVariable"],
            canAddOutPort: true,
          },
        };
        const { wrapper } = doMount({ props: { portGroups } });

        // select a group
        wrapper
          .findComponent(MenuItems)
          .vm.$emit("item-click", {}, { text: "group1" });
        await nextTick();

        expect(wrapper.emitted("itemClick")[0][0]).toEqual({
          typeId: "table",
          portGroup: "group1",
        });
        expect(wrapper.emitted("menuClose")).toBeDefined();
      });
    });

    describe("search results", () => {
      const doSearch = async (wrapper, query = "") => {
        wrapper.findComponent(SearchInput).vm.$emit("update:modelValue", query);
        await nextTick();
      };

      // eslint-disable-next-line vitest/max-nested-describe
      describe("no specified Port Groups -> all types allowed)", () => {
        it("shows all ports on empty search request", async () => {
          const { wrapper } = doMount();
          await doSearch(wrapper, "");

          expect(wrapper.findComponent(MenuItems).props("items")).toStrictEqual(
            [
              {
                icon: expect.anything(),
                port: { typeId: "suggested-1" },
                text: "Suggested 1",
                title: null,
              },
              {
                icon: expect.anything(),
                port: { typeId: "suggested-2" },
                text: "Suggested 2",
                title: null,
              },
              {
                icon: expect.anything(),
                port: { typeId: "flowVariable" },
                text: "Flow Variable",
                title: null,
              },
              {
                icon: expect.anything(),
                port: { typeId: "table" },
                text: "Table",
                title: null,
              },
            ],
          );
        });

        it("does a fuzzy search", async () => {
          const { wrapper } = doMount();
          await doSearch(wrapper, "flow");

          // Test that the results are rendered properly
          expect(wrapper.findComponent(MenuItems).props("items")).toStrictEqual(
            [
              {
                icon: expect.anything(),
                port: { typeId: "flowVariable" },
                text: "Flow Variable",
                title: null,
              },
            ],
          );
        });
      });

      it("renders placeholder if nothing found", async () => {
        const { wrapper } = doMount();

        await doSearch(wrapper, "doesntexist");

        expect(wrapper.findComponent(MenuItems).exists()).toBe(false);
        expect(wrapper.find(".placeholder").text()).toBe("No port matching");
      });

      it("emits itemActive", () => {
        const { wrapper } = doMount();
        wrapper.findComponent(MenuItems).vm.$emit("item-hovered", 0);
        expect(wrapper.emitted("itemActive").at(-1)[0]).toBe(0);
      });

      it("re-emits item click and menu-close", () => {
        const { wrapper } = doMount();
        wrapper
          .findComponent(MenuItems)
          .vm.$emit("item-click", null, { port: { typeId: "1" } });
        expect(wrapper.emitted("itemClick")).toStrictEqual([
          [{ typeId: "1", portGroup: null }],
        ]);
        expect(wrapper.emitted("menuClose")).toBeTruthy();
      });

      it("setup menu items", () => {
        const { wrapper } = doMount();

        expect(wrapper.findComponent(MenuItems).attributes("aria-label")).toBe(
          "Port Type Menu",
        );
        expect(wrapper.findComponent(MenuItems).classes()).toContain(
          "search-results",
        );
      });
    });

    it("should add title for ports with long names", async () => {
      const longName =
        "A port that has an extremely long and verbose name which the user likely will not see";
      const { wrapper, mockedStores } = doMount();

      mockedStores.applicationStore.availablePortTypes.long = {
        name: longName,
        color: "black",
      };
      await nextTick();

      expect(wrapper.find(`li[title="${longName}"]`).exists()).toBe(true);
    });
  });
});
