import CloudKnimeIcon from "@knime/styles/img/icons/cloud-knime.svg";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import ComputerDesktopIcon from "@knime/styles/img/icons/local-space.svg";
import PrivateSpaceIcon from "@knime/styles/img/icons/private-space.svg";
import ServerRacksIcon from "@knime/styles/img/icons/server-racks.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";
import UsersIcon from "@knime/styles/img/icons/users.svg";

import { SpaceProviderNS } from "@/api/custom-types";

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

  return { getSpaceProviderIcon, getSpaceGroupIcon, getSpaceIcon };
};
