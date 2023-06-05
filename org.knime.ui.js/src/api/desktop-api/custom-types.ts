export type SpaceProviderId = { spaceProviderId: string };
export type SpaceId = { spaceId: string };
export type SpaceItemId = { itemId: string };
export type FullSpacePath = SpaceProviderId & SpaceId & SpaceItemId;
export interface SpaceProvider {
  id: string;
  name: string;
  connected: boolean;
  connectionMode: "AUTHENTICATED" | "ANONYMOUS" | "AUTOMATIC";
}
