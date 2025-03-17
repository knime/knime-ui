import type { SpaceProviderNS } from "@/api/custom-types";

export type SingleSpaceProviderMetadata = {
  type: "single-space-provider";
  spaceProviderId: string;
  space: SpaceProviderNS.Space;
};
export type SignInMetadata = {
  type: "sign-in";
  spaceProviderId: string;
};
export type SpaceGroupMetadata = {
  type: "space-group";
  active: boolean;
};
export type SpaceMetadata = {
  type: "space";
  spaceProviderId: string;
  space: SpaceProviderNS.Space;
};
export type ExternalLinkMetadata = {
  type: "external-link";
  url: string;
};

export type AllMetadata =
  | SingleSpaceProviderMetadata
  | SignInMetadata
  | SpaceGroupMetadata
  | SpaceMetadata
  | ExternalLinkMetadata;

// groups and headlines are not clickable
export type ClickableItemsMetadata =
  | SpaceMetadata
  | SignInMetadata
  | SingleSpaceProviderMetadata
  | ExternalLinkMetadata;
