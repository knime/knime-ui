import { expect, describe, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";

import { Button } from "@knime/components";
import { deepMocked } from "@/test/utils";
import { API } from "@/api";
import UpdateBanner from "../UpdateBanner.vue";

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
