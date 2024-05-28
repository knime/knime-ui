import CloudKnimeIcon from "webapps-common/ui/assets/img/icons/cloud-knime.svg";
import ServerRacksIcon from "webapps-common/ui/assets/img/icons/server-racks.svg";
import ComputerDesktopIcon from "@/assets/computer-desktop.svg";
import UserIcon from "webapps-common/ui/assets/img/icons/user.svg";
import UsersIcon from "webapps-common/ui/assets/img/icons/users.svg";
import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import PrivateSpaceIcon from "webapps-common/ui/assets/img/icons/private-space.svg";

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
