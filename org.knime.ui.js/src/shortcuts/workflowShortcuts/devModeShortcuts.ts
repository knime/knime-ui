import CloudIcon from "@knime/styles/img/icons/cloud-knime.svg";

import { SpaceProvider } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import type { UnionToShortcutRegistry } from "../types";

type DevModeShortcuts = UnionToShortcutRegistry<"getVersions">;

const devModeShortcuts: DevModeShortcuts = {
  getVersions: {
    text: "Get versions",
    hotkey: ["V"],
    icon: CloudIcon,
    group: "development",
    execute: async () => {
      const { activeProjectProvider } = useSpaceProvidersStore();
      const { activeProjectOrigin } = useApplicationStore();

      // This should be store mutations of course
      const resource = `${activeProjectProvider?.hostname}/repository/${activeProjectOrigin?.itemId}/versions`;
      consola.info(`Fetching Hub item version from '${resource}'`);
      const response = await fetch(resource, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const versions = await response.json();
      consola.info(versions);
    },
    condition: () => {
      const { activeProjectProvider } = useSpaceProvidersStore();

      // Only show for Hub projects with a hostname set
      return Boolean(
        activeProjectProvider?.type === SpaceProvider.TypeEnum.HUB &&
          activeProjectProvider?.hostname,
      );
    },
  },
};

export default devModeShortcuts;
