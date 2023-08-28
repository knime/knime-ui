const ID_SEPARATOR = "__" as const;

export type BendpointId = `${string}${typeof ID_SEPARATOR}${string}`;

export const getBendpointId = (connectionId: string, bendpointIndex: number) =>
  `${connectionId}${ID_SEPARATOR}${bendpointIndex}`;

export const parseBendpointId = (bendpointId: string) => {
  const [connectionId, bendpointIndex] = bendpointId.split(ID_SEPARATOR);

  return {
    connectionId,
    index: Number(bendpointIndex),
  };
};
