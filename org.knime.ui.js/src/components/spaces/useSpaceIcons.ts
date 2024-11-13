import CloudKnimeIcon from "@knime/styles/img/icons/cloud-knime.svg";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import FileTextIcon from "@knime/styles/img/icons/file-text.svg";
import FolderIcon from "@knime/styles/img/icons/folder.svg";
import ComputerDesktopIcon from "@knime/styles/img/icons/local-space.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";
import PrivateSpaceIcon from "@knime/styles/img/icons/private-space.svg";
import ServerRacksIcon from "@knime/styles/img/icons/server-racks.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";
import UsersIcon from "@knime/styles/img/icons/users.svg";
import WorkflowNodeStackIcon from "@knime/styles/img/icons/workflow-node-stack.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import { SpaceItem } from "@/api/gateway-api/generated-api";

export const useSpaceIcons = () => {
  const getSpaceProviderIcon = (
    spaceProvider: SpaceProviderNS.SpaceProvider,
  ) => {
    const icons = {
      [SpaceProviderNS.TypeEnum.LOCAL]: ComputerDesktopIcon,
      [SpaceProviderNS.TypeEnum.HUB]: CloudKnimeIcon,
      [SpaceProviderNS.TypeEnum.SERVER]: ServerRacksIcon,
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

  const getSpaceIcon = (space: SpaceProviderNS.Space) =>
    space.private ? PrivateSpaceIcon : CubeIcon;

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
