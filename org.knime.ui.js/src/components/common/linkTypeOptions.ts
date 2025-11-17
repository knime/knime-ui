import { LinkType } from "@/api/gateway-api/generated-api";
import { localRootProjectPath } from "@/store/spaces/caching";

export type LinkTypeId = LinkType.TypeEnum;

export type LinkTypeOption = {
  id: LinkTypeId;
  text: string;
  description: string;
  linkValidity: string;
};

type BuildOptionsArgs = {
  sourceSpaceId?: string | null;
  selectedSpaceId?: string | null;
  includeNone?: boolean;
};

const createOption = (
  id: LinkTypeId,
  text: string,
  description: string,
  linkValidity: string,
): LinkTypeOption => ({
  id,
  text,
  description,
  linkValidity,
  // TODO: No need for extra property if its just concatenated to description?
});

export const buildLinkTypeOptions = ({
  sourceSpaceId,
  selectedSpaceId,
  includeNone = true,
}: BuildOptionsArgs): LinkTypeOption[] => {
  const effectiveSelectedSpaceId = selectedSpaceId ?? null;

  if (!effectiveSelectedSpaceId) {
    return includeNone
      ? [
          createOption(
            LinkType.TypeEnum.NONE,
            "Do not create link",
            "Keep a stand-alone copy of the component in the workflow.",
            "The component will not be linked and will not receive updates when the shared component changes.",
          ),
        ]
      : [];
  }

  const isLocal = effectiveSelectedSpaceId === localRootProjectPath.spaceId;
  const isSameSpace =
    Boolean(sourceSpaceId) && sourceSpaceId === effectiveSelectedSpaceId;

  const options: LinkTypeOption[] = [
    createOption(
      LinkType.TypeEnum.MOUNTPOINTABSOLUTE,
      "Create absolute link",
      "Links to the shared component using its full, fixed path.",
      "The link may break if the shared component is moved to a different location.",
    ),
  ];

  if (isSameSpace) {
    options.push(
      createOption(
        LinkType.TypeEnum.SPACERELATIVE,
        "Create space-relative link",
        "Links to the shared component relative to the space where it is stored.",
        "Stays valid as long as the workflow and component remain in the same space.",
      ),
    );
    options.push(
      createOption(
        LinkType.TypeEnum.WORKFLOWRELATIVE,
        "Create workflow-relative link",
        "Links to the shared component relative to the workflow location.",
        "Stays valid while the relative folder structure between workflow and component does not change.",
      ),
    );
  }

  if (!isLocal) {
    options.push(
      createOption(
        LinkType.TypeEnum.MOUNTPOINTABSOLUTEIDBASED,
        "Create ID-based absolute link",
        "Links to the shared component using its unique Hub identifier.",
        "Remains valid even if the component is moved or renamed on the Hub.",
      ),
    );
  }

  if (includeNone) {
    options.push(
      createOption(
        LinkType.TypeEnum.NONE,
        "Do not create link",
        "Saves the shared component but keeps a stand-alone copy in the workflow.",
        "The component is not linked and will not receive updates if the shared component changes.",
      ),
    );
  }

  return options;
};

export const toLinkType = (type: LinkTypeId): LinkType => ({ type });
