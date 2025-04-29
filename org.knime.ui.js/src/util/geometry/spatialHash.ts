import type { XY } from "@/api/gateway-api/generated-api";

export const buildSpatialHash = (
  objects: Record<string, { position: XY }>,
  cellSize: number,
) => {
  const hash: Record<string, string[]> = {};

  for (const [id, obj] of Object.entries(objects)) {
    const cellX = Math.floor(obj.position.x / cellSize);
    const cellY = Math.floor(obj.position.y / cellSize);
    const key = `${cellX},${cellY}`;

    if (!hash[key]) {
      hash[key] = [];
    }
    hash[key].push(id);
  }

  return { hash, cellSize };
};

export const queryNearbyObjects = (payload: {
  reference: { id: string; position: XY };
  objects: Record<string, { position: { x: number; y: number } }>;
  hash: Record<string, string[]>;
  aabbTest: (
    reference: { position: XY },
    candidate: { position: XY },
  ) => boolean;
  cellSize?: number;
}): string | null => {
  // eslint-disable-next-line no-magic-numbers
  const { reference, objects, hash, aabbTest, cellSize = 50 } = payload;
  const cellX = Math.floor(reference.position.x / cellSize);
  const cellY = Math.floor(reference.position.y / cellSize);

  for (let offsetX = -1; offsetX <= 1; offsetX++) {
    for (let offsetY = -1; offsetY <= 1; offsetY++) {
      const neighborKey = `${cellX + offsetX},${cellY + offsetY}`;
      const candidates = hash[neighborKey];
      if (!candidates) {
        continue;
      }

      for (const candidateId of candidates) {
        if (candidateId === reference.id) {
          continue;
        }

        const candidate = objects[candidateId];
        if (aabbTest(reference, candidate)) {
          return candidateId;
        }
      }
    }
  }

  return null;
};
