import { API } from "@api";
import { defineStore } from "pinia";

import type { AvailablePortTypes } from "@/api/custom-types";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import type { NodeTemplateWithExtendedPorts } from "@/util/dataMappers";
import { nodeTemplate } from "@/util/dataMappers";

type NodeTemplateDictionary = Record<string, NodeTemplateWithExtendedPorts>;

const uniqueStrings = (input: string[]) => [...new Set(input)];

type StringProperties<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

const arrayToDictionary = <T, K extends StringProperties<T>>(
  array: T[],
  key: K,
): Record<string, T> => {
  return Object.fromEntries(
    // map to key-value pairs
    array.map((value) => [value[key], value]),
  );
};

const toNodeTemplateDictionary = (
  availablePortTypes: AvailablePortTypes,
  nodeTemplates: Record<string, NodeTemplate>,
): NodeTemplateDictionary => {
  return arrayToDictionary(
    Object.values(nodeTemplates)
      // add expanded port information
      .map(nodeTemplate.toNodeTemplateWithExtendedPorts(availablePortTypes)),
    "id",
  );
};

export interface NodeTemplatesState {
  /**
   * Cache of node templates. Used to render the node icon previews,
   * as well as holding port information
   */
  cache: NodeTemplateDictionary;

  isDraggingNodeTemplate: boolean;
  draggedTemplateData: NodeTemplateWithExtendedPorts | null;
}

export const useNodeTemplatesStore = defineStore("nodeTemplates", {
  state: (): NodeTemplatesState => ({
    cache: {},

    isDraggingNodeTemplate: false,
    draggedTemplateData: null,
  }),
  actions: {
    updateCache(newValues: Partial<NodeTemplateDictionary>) {
      // @ts-expect-error (please add error description)
      this.cache = {
        ...this.cache,
        ...newValues,
      };
    },

    setIsDraggingNodeTemplate(isDraggingNodeTemplate: boolean) {
      this.isDraggingNodeTemplate = isDraggingNodeTemplate;
    },

    setDraggedTemplateData(
      draggedTemplateData: NodeTemplateWithExtendedPorts | null,
    ) {
      this.draggedTemplateData = draggedTemplateData;
    },

    async getSingleNodeTemplate({
      nodeTemplateId,
    }: {
      nodeTemplateId: string;
    }) {
      const { found, missing } = (await this.getNodeTemplates({
        nodeTemplateIds: [nodeTemplateId],
      })) as {
        found: Record<string, NodeTemplateWithExtendedPorts>;
        missing: string[];
      };

      if (missing.length > 0) {
        return null;
      }

      return found[nodeTemplateId];
    },

    async getNodeTemplates({ nodeTemplateIds }: { nodeTemplateIds: string[] }) {
      const idsToDictionary = (): NodeTemplateDictionary => {
        return Object.fromEntries(
          nodeTemplateIds
            .filter((id) => this.cache[id])
            .map((id) => [id, this.cache[id]]),
        );
      };

      // remove possibly repeated values
      const uniqueNodeTemplateIds = uniqueStrings(nodeTemplateIds);

      const uncachedTemplateIds = uniqueNodeTemplateIds.filter(
        (id) => !this.cache[id],
      );

      // every value is already cached, which also means no template id is missing
      if (uncachedTemplateIds.length === 0) {
        return { found: idsToDictionary(), missing: [] };
      }

      const nodeTemplates = await API.noderepository.getNodeTemplates({
        nodeTemplateIds: uncachedTemplateIds,
      });

      const nodeTemplateDictionary = toNodeTemplateDictionary(
        useApplicationStore().availablePortTypes,
        nodeTemplates,
      );

      this.updateCache(nodeTemplateDictionary);

      return {
        found: idsToDictionary(),

        // The `getNodeTemplates` endpoint can ignore ids for uninstalled extensions
        // so, we add that information to the response indicating that these ids are not found.
        // NOTE: Even if not found these ids are still valid templates ids;
        // meaning that the request will fail if a random unrecognized string is provided
        missing: nodeTemplateIds.filter((id) => !this.cache[id]),
      };
    },

    updateCacheFromSearchResults({
      nodeTemplates,
    }: {
      nodeTemplates: Array<NodeTemplateWithExtendedPorts>;
    }) {
      const nodeTemplateDictionary = arrayToDictionary(
        // only update non-cached templates
        nodeTemplates.filter(({ id }) => !this.cache[id]),
        "id",
      );

      this.updateCache(nodeTemplateDictionary);
    },

    setDraggingNodeTemplate(
      nodeTemplate: NodeTemplateWithExtendedPorts | null,
    ) {
      this.setIsDraggingNodeTemplate(Boolean(nodeTemplate));
      this.setDraggedTemplateData(nodeTemplate);
    },
  },
});
