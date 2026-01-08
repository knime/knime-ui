import type { Bounds } from "@/api/gateway-api/generated-api";
import { geometry } from "@/util/geometry";
import type { WorkflowObject } from "../types";

const getKey = (cx: number, cy: number) => `${cx},${cy}`;

type AABBTestFn = (reference: Bounds, candidate: Bounds) => boolean;

type TesterFnHandlers = Record<
  Exclude<WorkflowObject["type"], "componentPlaceholder">,
  AABBTestFn
>;

type Options = {
  aabbTesters?: Partial<TesterFnHandlers>;
  cellSize?: number;
};

const defaults = {
  cellSize: 64,
  aabbTesters: {
    node: geometry.utils.isIntersecting,
    annotation: geometry.utils.rectContains,
  } satisfies TesterFnHandlers,
} as const;

export class SpatialHash {
  private cellSize: number;
  private aabbTesters: TesterFnHandlers;

  // "cell x, cell y" -> ids
  private grid = new Map<string, string[]>();
  private byId = new Map<string, WorkflowObject>();

  constructor(options: Options = {}) {
    this.cellSize = options.cellSize ?? defaults.cellSize;
    this.aabbTesters = { ...defaults.aabbTesters, ...options.aabbTesters };
  }

  clear() {
    this.grid.clear();
    this.byId.clear();
  }

  reset(objects: WorkflowObject[]) {
    this.clear();
    for (const o of objects) {
      this.byId.set(o.id, o);
      this.insert(o);
    }
  }

  get(id: string) {
    return this.byId.get(id);
  }

  /**
   * Finds all the objects that lie inside a reference Bounds rect
   */
  queryRectBounds(referenceRect: Bounds) {
    const c0x = this.toCell(referenceRect.x);
    const c1x = this.toCell(referenceRect.x + referenceRect.width);
    const c0y = this.toCell(referenceRect.y);
    const c1y = this.toCell(referenceRect.y + referenceRect.height);

    const candidates = new Set<string>();

    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cy = c0y; cy <= c1y; cy++) {
        const bucket = this.grid.get(getKey(cx, cy));
        if (bucket) {
          for (const id of bucket) {
            candidates.add(id);
          }
        }
      }
    }

    const inside = new Map<
      string,
      { id: string; type: "node" | "annotation" }
    >();

    for (const id of candidates) {
      const candidate = this.byId.get(id);

      // component placeholders should be ignored by most interactions
      if (!candidate || candidate.type === "componentPlaceholder") {
        continue;
      }

      if (
        this.aabbTesters[candidate.type](referenceRect, {
          x: candidate.x,
          y: candidate.y,
          width: candidate.width ?? 1,
          height: candidate.height ?? 1,
        })
      ) {
        inside.set(id, { id, type: candidate.type });
      }
    }

    return { inside };
  }

  /**
   * Finds all objects that are near a given reference
   */
  queryNearbyObjects(reference: WorkflowObject) {
    const cellX = this.toCell(reference.x);
    const cellY = this.toCell(reference.y);

    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        const neighborKey = getKey(cellX + offsetX, cellY + offsetY);
        const candidates = this.grid.get(neighborKey);
        if (!candidates) {
          continue;
        }

        for (const candidateId of candidates) {
          if (candidateId === reference.id) {
            continue;
          }

          const candidate = this.get(candidateId);
          if (
            candidate &&
            this.aabbTesters[candidate.type](reference, candidate)
          ) {
            return candidateId;
          }
        }
      }
    }

    return null;
  }

  private insert(object: WorkflowObject) {
    const c0x = this.toCell(object.x);
    const c1x = this.toCell(object.x + (object.width ?? 1));
    const c0y = this.toCell(object.y);
    const c1y = this.toCell(object.y + (object.height ?? 1));
    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cy = c0y; cy <= c1y; cy++) {
        const key = getKey(cx, cy);
        let bucket = this.grid.get(key);
        if (!bucket) {
          this.grid.set(key, (bucket = []));
        }
        bucket.push(object.id);
      }
    }
  }

  private toCell(value: number) {
    return Math.floor(value / this.cellSize);
  }
}
