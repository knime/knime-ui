import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";
import { debounce } from "lodash-es";

import { Button } from "@knime/components";

import { API } from "@/api";
import { deepMocked } from "@/test/utils";
import UpdateBanner from "../UpdateBanner.vue";

// Mock lodash-es debounce function
vi.mock("lodash-es", () => ({
  debounce: vi.fn((fn) => fn),
}));

const mockedAPI = deepMocked(API);

describe("UpdateBanner", () => {
  const doShallowMount = ({ props = {} } = {}) => {
    const defaultProps = {
      availableUpdates: {
        newReleases: [
          {
            isUpdatePossible: true,
            name: "KNIME Analytics Platform 5.0",
            shortName: "5.0",
          },
        ],
        bugfixes: ["Update1", "Update2"],
      },
    };

    const wrapper = shallowMount(UpdateBanner, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };
  const getUpdateText = (wrapper) => wrapper.find(".text").text();
  const getButtonText = (wrapper) => wrapper.findComponent(Button).text();

  it("should debounce the onUpdateAction method", async () => {
    const { wrapper } = doShallowMount();

    await wrapper.findComponent(Button).trigger("click");

    expect(debounce).toHaveBeenCalledWith(expect.any(Function), 600);
  });

  it("should prevent multiple dialog openings", async () => {
    const { wrapper } = doShallowMount();

    mockedAPI.desktop.openUpdateDialog.mockResolvedValue(Promise.resolve());

    await wrapper.findComponent(Button).trigger("click");

    expect(mockedAPI.desktop.openUpdateDialog).toHaveBeenCalledTimes(0);

    await wrapper.findComponent(Button).trigger("click");

    expect(mockedAPI.desktop.openUpdateDialog).toHaveBeenCalledTimes(1);
  });

  it("should reset isDialogOpen after the dialog closes", async () => {
    const { wrapper } = doShallowMount();

    mockedAPI.desktop.openUpdateDialog.mockResolvedValueOnce(Promise.resolve());

    await wrapper.findComponent(Button).trigger("click");

    expect(mockedAPI.desktop.openUpdateDialog).toHaveBeenCalled();

    await nextTick();

    expect(wrapper.vm.isDialogOpen).toBe(false);
  });

  describe("bugfixes", () => {
    it("should show the right message (1 bugfix)", () => {
      const { wrapper } = doShallowMount({
        props: {
          availableUpdates: {
            bugfixes: ["5.1.1"],
          },
        },
      });

      expect(getUpdateText(wrapper)).toBe(
        "There is an update for 1 extension available.",
      );
    });

    it("should show the right message (multiple bugfix)", () => {
      const totalBugfixes = 3;

      const { wrapper } = doShallowMount({
        props: {
          availableUpdates: {
            bugfixes: Array(totalBugfixes).fill("fix"),
          },
        },
      });

      expect(getUpdateText(wrapper)).toBe(
        `There are updates for ${totalBugfixes} extensions available.`,
      );
    });

    it("should display the correct button text", async () => {
      const { wrapper } = doShallowMount({
        props: {
          availableUpdates: {
            bugfixes: ["5.1.1"],
          },
        },
      });

      expect(getButtonText(wrapper)).toBe("Update");
      await wrapper.findComponent(Button).trigger("click");
      expect(mockedAPI.desktop.openUpdateDialog).toHaveBeenCalled();
    });
  });

  describe("new releases", () => {
    it("should show the right message when update is possible", async () => {
      const { wrapper } = doShallowMount({
        props: {
          availableUpdates: {
            newReleases: [
              {
                isUpdatePossible: true,
                name: "KNIME Analytics Platform 5.2",
                shortName: "5.2.0",
              },
            ],
          },
        },
      });

      expect(getUpdateText(wrapper)).toBe(
        "Get the latest features and enhancements! Update to 5.2.0 now.",
      );

      expect(getButtonText(wrapper)).toBe("Update");
      await wrapper.findComponent(Button).trigger("click");
      expect(mockedAPI.desktop.openUpdateDialog).toHaveBeenCalled();
    });

    it("should show the right message when multiple updates are present and possible", async () => {
      const { wrapper } = doShallowMount({
        props: {
          availableUpdates: {
            newReleases: [
              {
                isUpdatePossible: true,
                name: "KNIME Analytics Platform 5.2",
                shortName: "5.2.0",
              },
              {
                isUpdatePossible: true,
                name: "KNIME Analytics Platform 5.1",
                shortName: "5.1.0",
              },
            ],
          },
        },
      });

      expect(getUpdateText(wrapper)).toBe(
        "Get the latest features and enhancements! Update to 5.2.0 now.",
      );

      expect(getButtonText(wrapper)).toBe("Update");
      await wrapper.findComponent(Button).trigger("click");
      expect(mockedAPI.desktop.openUpdateDialog).toHaveBeenCalled();
    });

    it("should show the right message when multiple updates are present and at least one is not possible", async () => {
      const windowOpen = vi.fn();
      window.open = windowOpen;
      const { wrapper } = doShallowMount({
        props: {
          availableUpdates: {
            newReleases: [
              {
                isUpdatePossible: false,
                name: "KNIME Analytics Platform 5.2",
                shortName: "5.2.0",
              },
              {
                isUpdatePossible: true,
                name: "KNIME Analytics Platform 5.1",
                shortName: "5.1.0",
              },
            ],
          },
        },
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(getUpdateText(wrapper)).toBe(
        "Get the latest features and enhancements! Download 5.2.0 now.",
      );

      expect(getButtonText(wrapper)).toBe("Download");
      await wrapper.findComponent(Button).trigger("click");
      expect(windowOpen).toHaveBeenCalled();
    });
  });

  it("should prioritize bugfixes if newReleases are also present", () => {
    const { wrapper } = doShallowMount({
      props: {
        availableUpdates: {
          bugfixes: ["5.1.1"],
          newReleases: [
            {
              isUpdatePossible: true,
              name: "KNIME Analytics Platform 5.2",
              shortName: "5.2.0",
            },
            {
              isUpdatePossible: true,
              name: "KNIME Analytics Platform 5.1",
              shortName: "5.1.0",
            },
          ],
        },
      },
    });

    expect(getUpdateText(wrapper)).toBe(
      "There is an update for 1 extension available.",
    );
    expect(getButtonText(wrapper)).toBe("Update");
  });
});
