import UnconnectedProviderIcon from "@knime/styles/img/icons/cloud-close.svg";
import CloudKnimeIcon from "@knime/styles/img/icons/cloud-knime.svg";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import FileTextIcon from "@knime/styles/img/icons/file-text.svg";
import FolderIcon from "@knime/styles/img/icons/folder.svg";
import UnknownIcon from "@knime/styles/img/icons/help.svg";
import LocalSpaceIcon from "@knime/styles/img/icons/local-space.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";
import PrivateSpaceIcon from "@knime/styles/img/icons/private-space.svg";
import ServerIcon from "@knime/styles/img/icons/server-racks.svg";
import UnknownSpaceIcon from "@knime/styles/img/icons/sign-warning.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";
import UsersIcon from "@knime/styles/img/icons/users.svg";
import WorkflowNodeStackIcon from "@knime/styles/img/icons/workflow-node-stack.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import { SpaceItem } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";

export const useSpaceIcons = () => {
  const getSpaceProviderIconFallback = () => {
    const { getProviderInfoFromActiveProject } = useSpaceProvidersStore();
    const matchedProvider = getProviderInfoFromActiveProject();
    if (!matchedProvider) {
      return UnknownIcon;
    }
    if (!matchedProvider.connected) {
      return UnconnectedProviderIcon;
    }

    const spaceId = useApplicationStore().activeProject?.origin?.spaceId;
    const spaceIds = matchedProvider.spaceGroups
      .flatMap(({ spaces }) => spaces)
      .flatMap(({ id }) => id);
    if (!spaceId || !spaceIds.includes(spaceId)) {
      return UnknownSpaceIcon;
    }

    return UnknownIcon;
  };

  /**
   * Gets a space provider icon
   *
   *  @param spaceProvider space provider to get the icon for. If null falls back to the active project’s provider.
   */
  const getSpaceProviderIcon = (
    spaceProvider: SpaceProviderNS.SpaceProvider | null,
  ) => {
    if (!spaceProvider) {
      return getSpaceProviderIconFallback();
    }

    const icons = {
      [SpaceProviderNS.TypeEnum.LOCAL]: LocalSpaceIcon,
      [SpaceProviderNS.TypeEnum.HUB]: CloudKnimeIcon,
      [SpaceProviderNS.TypeEnum.SERVER]: ServerIcon,
    };

    return icons[spaceProvider.type];
  };

  const getSpaceGroupIcon = (spaceGroup: SpaceProviderNS.SpaceGroup) => {
    const icons = {
      [SpaceProviderNS.UserTypeEnum.TEAM]: UsersIcon,
      [SpaceProviderNS.UserTypeEnum.USER]: UserIcon,
    };

    return icons[spaceGroup.type];
  };

  const getSpaceIcon = (space?: SpaceProviderNS.Space) => {
    return space?.private ? PrivateSpaceIcon : CubeIcon;
  };

  const getSpaceItemIcon = (type: SpaceItem.TypeEnum) => {
    const typeIcons = {
      [SpaceItem.TypeEnum.WorkflowGroup]: FolderIcon,
      [SpaceItem.TypeEnum.Workflow]: WorkflowIcon,
      [SpaceItem.TypeEnum.Component]: NodeWorkflowIcon,
      [SpaceItem.TypeEnum.WorkflowTemplate]: WorkflowNodeStackIcon,
      [SpaceItem.TypeEnum.Data]: FileTextIcon,
    };

    return typeIcons[type];
  };

  return {
    getSpaceProviderIcon,
    getSpaceGroupIcon,
    getSpaceIcon,
    getSpaceItemIcon,
  };
};
