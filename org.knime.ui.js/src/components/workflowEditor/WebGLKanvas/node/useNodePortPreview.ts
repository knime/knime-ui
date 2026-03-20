/* eslint-disable no-magic-numbers */
import { ref } from "vue";
import { defineStore } from "pinia";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";

import { API } from "@/api";
import type { NodePort } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";

export const FLOW_VARIABLE_PORT_TYPE_ID =
  "org.knime.core.node.port.flowvariable.FlowVariablePortObject";

const IMAGE_PORT_TYPE_ID = "org.knime.core.node.port.image.ImagePortObject";

export type TablePreview = {
  columns: string[];
  columnTypes: string[];
  rows: string[][];
  totalRows: number;
  totalCols: number;
  /** Data URL for image output ports (SVG or raster) */
  imageUrl?: string;
} | null;

/**
 * If the raw string is SVG or an existing data URL, return it as a usable data URL.
 */
const tryParseImageData = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) {
    const encoded = btoa(unescape(encodeURIComponent(trimmed)));
    return `data:image/svg+xml;base64,${encoded}`;
  }
  // Base64-encoded raster images (PNG magic: iVBOR, JPEG magic: /9j/)
  if (trimmed.startsWith("iVBOR")) return `data:image/png;base64,${trimmed}`;
  if (trimmed.startsWith("/9j/")) return `data:image/jpeg;base64,${trimmed}`;
  return null;
};

/** Resolve a KNIME numeric type-hash to a short human-readable label. */
const resolveTypeName = (
  typeId: number | string,
  dataTypes: Record<string, any>,
): string => {
  const dt = dataTypes[String(typeId)];
  if (!dt) return String(typeId);
  // New KNIME table view format: { name, renderers, ... }
  if (dt.name) return dt.name;
  // Fallback: use first renderer name
  return dt.renderers?.[0]?.name ?? String(typeId);
};

/**
 * Parse row/col counts from the NodePort.info tooltip string.
 * KNIME formats this as e.g. "Rows: 3210, Columns: 14" or "3,210 rows, 14 columns".
 */
const parsePortInfo = (info: string | undefined): { rows: number; cols: number } | null => {
  if (!info) return null;
  // Handles "Rows: 1, Cols: 19" and "1 rows, 19 columns" and similar
  const rowMatch = info.match(/rows?[:\s]+(\d[\d,]*)|(\d[\d,]*)\s*rows?/i);
  const colMatch = info.match(/cols?(?:umns?)?[:\s]+(\d[\d,]*)|(\d[\d,]*)\s*cols?(?:umns?)?/i);
  if (!rowMatch && !colMatch) return null;
  const parse = (m: RegExpMatchArray) => parseInt((m[1] ?? m[2]).replace(/,/g, ""), 10);
  return {
    rows: rowMatch ? parse(rowMatch) : 0,
    cols: colMatch ? parse(colMatch) : 0,
  };
};

/**
 * Tries to extract a columns + rows table from the opaque JSON response
 * of `callPortDataService`. Handles the KNIME table view response shape:
 *   { result: { dataTypes: {...}, table: { displayedColumns, columnDataTypeIds, rows, rowCount, ... } } }
 * and several legacy shapes.
 */
const tryParseTableData = (raw: unknown): TablePreview => {
  // Image/SVG response — check before JSON parsing
  if (typeof raw === "string") {
    const imageUrl = tryParseImageData(raw);
    if (imageUrl) {
      return {
        columns: [],
        columnTypes: [],
        rows: [],
        totalRows: 0,
        totalCols: 0,
        imageUrl,
      };
    }
  }

  try {
    const parsed =
      raw === null || raw === undefined
        ? null
        : typeof raw === "string"
          ? JSON.parse(raw)
          : raw;

    if (!parsed) return null;

    // KNIME's data service wraps the response in { result: <object or string> }
    const resultField = (parsed as any)?.result;

    // Image port: result field is the SVG/image string directly
    if (typeof resultField === "string") {
      const imageUrl = tryParseImageData(resultField);
      if (imageUrl) {
        return { columns: [], columnTypes: [], rows: [], totalRows: 0, totalCols: 0, imageUrl };
      }
    }

    const inner =
      typeof resultField === "string" ? JSON.parse(resultField) : resultField;

    const data = inner ?? parsed;

    // The actual table object (where columns & rows live)
    const table: any =
      (data as any)?.table ??
      (data as any)?.result?.table ??
      (data as any)?.result ??
      data;

    // dataTypes registry (for resolving columnDataTypeIds → human names)
    const dataTypes: Record<string, any> = (data as any)?.dataTypes ?? {};

    // ── Column names ──────────────────────────────────────────────────────────
    const columns: string[] =
      table?.displayedColumns ??  // KNIME table view format
      table?.columnHeaders ??
      table?.columns ??
      table?.header ??
      [];

    // ── Column types ──────────────────────────────────────────────────────────
    const columnTypes: string[] = (() => {
      // New format: numeric IDs resolved via dataTypes registry
      if (Array.isArray(table?.columnDataTypeIds) && Object.keys(dataTypes).length > 0) {
        return (table.columnDataTypeIds as (number | string)[]).map((id) =>
          resolveTypeName(id, dataTypes),
        );
      }
      return (
        table?.columnTypes ??
        table?.columnDataTypes ??
        table?.types ??
        []
      );
    })();

    // ── Rows ──────────────────────────────────────────────────────────────────
    const rawRows: unknown[] = table?.rows ?? [];

    const rows = rawRows.slice(0, 5).map((row: unknown) => {
      if (Array.isArray(row)) return (row as unknown[]).map(String);
      if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        // KNIME table view: { rowKey: "Row0", values: [...] }
        if (Array.isArray(r.values)) return (r.values as unknown[]).map(String);
        if (Array.isArray(r.data)) return (r.data as unknown[]).map(String);
        // Legacy numeric-keyed: { rowKey: "Row0", 0: "val", 1: "val" }
        return Object.entries(r)
          .filter(([k]) => k !== "rowKey")
          .map(([, v]) => String(v));
      }
      return [String(row)];
    });

    // ── Totals ────────────────────────────────────────────────────────────────
    const settings: any = (data as any)?.settings;

    const totalCols: number =
      table?.columnCount ??
      table?.numColumns ??
      table?.totalCols ??
      settings?.totalColumnCount ??
      settings?.columnCount ??
      columns.length;

    const totalRows: number =
      settings?.totalRowCount ??
      settings?.rowCount ??
      table?.totalRowCount ??
      table?.rowCount ??
      table?.totalRows ??
      table?.numRows ??
      rawRows.length;

    if (columns.length > 0 || rows.length > 0) {
      return { columns, columnTypes, rows, totalRows, totalCols };
    }
  } catch {
    // ignore parse errors — return null
  }
  return null;
};

const previewKey = (nodeId: string, portIdx: number) => `${nodeId}:${portIdx}`;

export const useNodePortPreviewStore = defineStore("nodePortPreview", () => {
  /** Keyed by `${nodeId}:${portIdx}` */
  const previews = ref<Record<string, TablePreview>>({});
  const loading = ref<Set<string>>(new Set());
  /** Tracks nodes for which we have already attempted fetching all ports. */
  const fetchedNodes = ref<Set<string>>(new Set());

  const getPreview = (nodeId: string, portIdx: number): TablePreview =>
    previews.value[previewKey(nodeId, portIdx)] ?? null;

  const isLoading = (nodeId: string): boolean => loading.value.has(nodeId);

  const fetchPreview = async (
    nodeId: string,
    outPorts: NodePort[],
  ): Promise<void> => {
    if (loading.value.has(nodeId) || fetchedNodes.value.has(nodeId)) {
      return;
    }

    const dataPorts = outPorts.filter(
      (p) => p.typeId !== FLOW_VARIABLE_PORT_TYPE_ID,
    );

    if (dataPorts.length === 0) {
      fetchedNodes.value.add(nodeId);
      return;
    }

    const { projectId, workflowId } =
      useWorkflowStore().getProjectAndWorkflowIds;
    const versionId = useWorkflowStore().activeWorkflow?.info.version;

    if (!projectId || !workflowId) {
      fetchedNodes.value.add(nodeId);
      return;
    }

    loading.value.add(nodeId);

    try {
      await Promise.all(
        dataPorts.map(async (dataPort) => {
          const callArgs = {
            projectId,
            workflowId,
            versionId: versionId ?? CURRENT_STATE_VERSION,
            nodeId,
            portIdx: dataPort.index,
            viewIdx: 0,
          } as const;

          try {
            const key = previewKey(nodeId, dataPort.index);
            const isImagePort = dataPort.typeId === IMAGE_PORT_TYPE_ID;

            if (isImagePort) {
              // Image ports: getPortView activates rendering on the backend,
              // then initial_data returns the image content.
              let portView: any;
              try {
                portView = await API.port.getPortView(callArgs);
              } catch {
                // No port view available — fall through to direct initial_data attempt
              }
              try {
                const rawInitial = await API.port.callPortDataService({
                  ...callArgs,
                  serviceType: "initial_data",
                });
                const imagePreview = tryParseTableData(rawInitial);
                previews.value[key] = imagePreview;
              } catch {
                previews.value[key] = null;
              } finally {
                if (portView?.deactivationRequired) {
                  API.port.deactivatePortDataServices(callArgs).catch(() => {});
                }
              }
              return;
            }

            // Step 1: initial_data returns column schema + settings. Rows are always empty here.
            const rawInitial = await API.port.callPortDataService({
              ...callArgs,
              serviceType: "initial_data",
            });
            let initialPreview = tryParseTableData(rawInitial);

            // Patch totalRows/totalCols from port.info if initial_data didn't provide them.
            // port.info contains e.g. "Rows: 3210, Columns: 14" for executed data ports.
            if (initialPreview) {
              const portCounts = parsePortInfo(dataPort.info);
              if (portCounts) {
                initialPreview = {
                  ...initialPreview,
                  totalRows: initialPreview.totalRows || portCounts.rows,
                  totalCols: initialPreview.totalCols || portCounts.cols,
                };
              }
            }

            // Step 2: fetch actual row data. Requires activating the port view first.
            // Many ports don't support a port view — fall back to column schema + counts.
            if (initialPreview && initialPreview.columns.length > 0) {
              let portView: any;
              try {
                portView = await API.port.getPortView(callArgs);
              } catch {
                // Port has no web view — row data unavailable, fall through to portInfo counts
              }
              if (portView) {
                try {
                  const rawData = await API.port.callPortDataService({
                    ...callArgs,
                    serviceType: "data",
                    dataServiceRequest: JSON.stringify({
                      method: "getTable",
                      options: { pageSize: 5, currentPage: 0 },
                    }),
                  });
                  const dataPreview = tryParseTableData(rawData);
                  if (dataPreview && dataPreview.rows.length > 0) {
                    previews.value[key] = {
                      ...initialPreview,
                      rows: dataPreview.rows,
                      totalRows: dataPreview.totalRows || initialPreview.totalRows,
                    };
                    return;
                  }
                } catch {
                  // data service failed — portInfo counts already applied above
                } finally {
                  if (portView.deactivationRequired) {
                    API.port.deactivatePortDataServices(callArgs).catch(() => {});
                  }
                }
              }
            }

            previews.value[key] = initialPreview;
          } catch {
            previews.value[previewKey(nodeId, dataPort.index)] = null;
          }
        }),
      );
    } finally {
      loading.value.delete(nodeId);
      fetchedNodes.value.add(nodeId);
    }
  };

  /** Clear cached previews for a node (e.g. when it starts re-executing). */
  const clearPreview = (nodeId: string): void => {
    for (const key of Object.keys(previews.value)) {
      if (key.startsWith(`${nodeId}:`)) {
        delete previews.value[key];
      }
    }
    fetchedNodes.value.delete(nodeId);
  };

  return { getPreview, isLoading, fetchPreview, clearPreview };
});
