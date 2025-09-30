import { merge } from "lodash-es";

import type {
  ConfigurationLayout,
  ConfigurationLayoutEditorNode,
  ConfigurationLayoutEditorRow,
} from "@/store/layoutEditor/types/configuration";
import type {
  LayoutEditorColumn,
  LayoutEditorNestedLayoutNode,
  LayoutEditorNode,
  LayoutEditorQuickformNode,
  LayoutEditorRowItem,
  LayoutEditorViewItem,
  LayoutEditorViewLayout,
  LayoutEditorViewNode,
  ResizeColumnInfo,
} from "@/store/layoutEditor/types/view";
import { layoutEditorGridSize } from "@/style/shapes";
import type { DeepPartial } from "../utils";

import { NODE_FACTORIES } from "./common";

export const createConfigRow = (
  nodeID: string,
): ConfigurationLayoutEditorRow => ({
  type: "row",
  columns: [{ content: [{ type: "configuration", nodeID }] }],
});

export const createViewItem = (
  nodeID: string = "vi1",
): LayoutEditorViewItem => ({
  nodeID,
  type: "view",
});

export const createViewNode = (
  nodeID: string = "vn1",
): LayoutEditorViewNode => ({
  nodeID,
  type: "view",
  templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
  availableInDialog: false,
  description: null,
  icon: "",
  name: "",
  layout: createViewItem(),
});

export const createQuickform = (
  nodeID: string = "qf1",
): LayoutEditorQuickformNode => ({
  nodeID,
  type: "quickform",
  templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
  availableInDialog: false,
  description: null,
  icon: "",
  name: "",
  layout: createViewItem(nodeID),
});

export const createNestedLayout = (
  nodeID: string = "nl1",
): LayoutEditorNestedLayoutNode => ({
  nodeID,
  type: "nestedLayout",
  templateId: null,
  availableInDialog: false,
  description: null,
  icon: "",
  name: "",
  layout: createViewItem(nodeID),
  containerLegacyModeEnabled: false,
});

export const createColumn = (): LayoutEditorColumn => ({
  content: [createViewItem(), createNestedLayout()],
  widthXS: layoutEditorGridSize,
});

export const createEmptyRow = (): LayoutEditorRowItem => ({
  type: "row",
  columns: [{ content: [], widthXS: layoutEditorGridSize }],
});

export const createComplexLayout = (): LayoutEditorViewLayout => ({
  rows: [
    {
      type: "row",
      columns: [
        {
          content: [
            {
              type: "view",
              scrolling: false,
              nodeID: "1",
              useLegacyMode: false,
              resizeMethod: "aspectRatio4by3",
              autoResize: true,
              sizeHeight: true,
              sizeWidth: false,
            },
            {
              type: "row",
              columns: [
                {
                  content: [
                    {
                      type: "view",
                      scrolling: false,
                      nodeID: "2",
                      useLegacyMode: true,
                      resizeMethod: "aspectRatio16by9",
                      autoResize: true,
                      sizeHeight: true,
                      sizeWidth: false,
                    },
                    {
                      type: "view",
                      scrolling: false,
                      nodeID: "3",
                      useLegacyMode: true,
                      resizeMethod: "aspectRatio16by9",
                      autoResize: true,
                      sizeHeight: true,
                      sizeWidth: false,
                    },
                    {
                      type: "view",
                      scrolling: false,
                      nodeID: "4",
                      useLegacyMode: true,
                      resizeMethod: "viewLowestElement",
                      autoResize: true,
                      sizeHeight: true,
                      sizeWidth: false,
                    },
                  ],
                  widthXS: 6,
                },
                {
                  content: [
                    {
                      type: "row",
                      columns: [
                        {
                          content: [
                            {
                              type: "view",
                              scrolling: false,
                              nodeID: "7",
                              useLegacyMode: true,
                              resizeMethod: "viewLowestElement",
                              autoResize: true,
                              sizeHeight: true,
                              sizeWidth: false,
                            },
                          ],
                          widthXS: 12,
                        },
                      ],
                    },
                    {
                      type: "row",
                      columns: [
                        {
                          content: [
                            {
                              type: "view",
                              scrolling: false,
                              nodeID: "3",
                              useLegacyMode: true,
                              resizeMethod: "aspectRatio16by9",
                              autoResize: true,
                              sizeHeight: true,
                              sizeWidth: false,
                            },
                          ],
                          widthXS: 6,
                        },
                        {
                          content: [
                            {
                              type: "view",
                              scrolling: false,
                              nodeID: "2",
                              useLegacyMode: true,
                              resizeMethod: "aspectRatio16by9",
                              autoResize: true,
                              sizeHeight: true,
                              sizeWidth: false,
                            },
                          ],
                          widthXS: 6,
                        },
                      ],
                    },
                  ],
                  widthXS: 6,
                },
              ],
            },
          ],
          widthXS: 6,
        },
        {
          content: [
            {
              type: "view",
              scrolling: false,
              nodeID: "1",
              useLegacyMode: true,
              resizeMethod: "aspectRatio16by9",
              autoResize: true,
              sizeHeight: true,
              sizeWidth: false,
            },
          ],
          widthXS: 6,
        },
      ],
    },
    {
      type: "row",
      columns: [
        {
          content: [
            {
              type: "view",
              scrolling: false,
              nodeID: "1",
              useLegacyMode: true,
              resizeMethod: "aspectRatio16by9",
              autoResize: true,
              sizeHeight: true,
              sizeWidth: false,
            },
            {
              type: "view",
              scrolling: false,
              nodeID: "100",
              useLegacyMode: true,
              resizeMethod: "aspectRatio16by9",
              autoResize: true,
              sizeHeight: true,
              sizeWidth: false,
            },
          ],
          widthXS: 12,
        },
      ],
    },
  ],
  parentLayoutLegacyMode: false,
});

export const createNodes = (): LayoutEditorNode[] => [
  {
    nodeID: "1",
    availableInView: true,
    description:
      "This is a very long node description to test if it breaks the layout. Does it?",
    icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAABB0lEQVQ4jaWTO26FMBBFL1EkChdUuGYBsAYKehZAAxT0ZgXshM8a2ADboEIWDR2fBho0KaKHZPFICLmdRz7HGmtGA0BEhKf5eAI1TQPLso4z3c04jhSGIQGgF3dbUBQFGYZxwLcFXdeR67oKyDknIcTvgizLFJAxRkEQUF3XVNc1ERF9Xn1SFEWQUh41z/OQJAkYY8pdRTBNE4QQqKrqqDmOAyEEOOcK2Pe9KijLEkIIzPMMAOCcI01T2LZ9Atu2xbquqiCOYwAAYwxJksDzvB/Bty0EQQDf95U+r8CTIM9z6LqOfd+xLAuGYYCUEtu2vQVPAtM0b714Kfgr+IqGf26jhu8pe5wvP5Uh6wYf5FQAAAAASUVORK5CYII=",
    type: "view",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    layout: {
      type: "view",
      resizeMethod: "aspectRatio16by9",
      resizeInterval: null,
      resizeTolerance: null,
      autoResize: true,
      scrolling: false,
      sizeHeight: true,
      sizeWidth: false,
      maxHeight: null,
      maxWidth: null,
      minHeight: null,
      minWidth: null,
      nodeID: "1",
      additionalClasses: [],
      additionalStyles: [],
    },
    name: "Line Chart (JavaScript)",
  },
  {
    nodeID: "2",
    availableInView: true,
    description: null,
    icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAABB0lEQVQ4jaWTO26FMBBFL1EkChdUuGYBsAYKehZAAxT0ZgXshM8a2ADboEIWDR2fBho0KaKHZPFICLmdRz7HGmtGA0BEhKf5eAI1TQPLso4z3c04jhSGIQGgF3dbUBQFGYZxwLcFXdeR67oKyDknIcTvgizLFJAxRkEQUF3XVNc1ERF9Xn1SFEWQUh41z/OQJAkYY8pdRTBNE4QQqKrqqDmOAyEEOOcK2Pe9KijLEkIIzPMMAOCcI01T2LZ9Atu2xbquqiCOYwAAYwxJksDzvB/Bty0EQQDf95U+r8CTIM9z6LqOfd+xLAuGYYCUEtu2vQVPAtM0b714Kfgr+IqGf26jhu8pe5wvP5Uh6wYf5FQAAAAASUVORK5CYII=",
    type: "view",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    layout: {
      type: "view",
      resizeMethod: "aspectRatio16by9",
      resizeInterval: null,
      resizeTolerance: null,
      autoResize: true,
      scrolling: false,
      sizeHeight: true,
      sizeWidth: false,
      maxHeight: null,
      maxWidth: null,
      minHeight: null,
      minWidth: null,
      nodeID: "2",
      additionalClasses: [],
      additionalStyles: [],
    },
    name: "Heatmap (JavaScript)",
  },
  {
    nodeID: "3",
    availableInView: true,
    description: null,
    icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAABB0lEQVQ4jaWTO26FMBBFL1EkChdUuGYBsAYKehZAAxT0ZgXshM8a2ADboEIWDR2fBho0KaKHZPFICLmdRz7HGmtGA0BEhKf5eAI1TQPLso4z3c04jhSGIQGgF3dbUBQFGYZxwLcFXdeR67oKyDknIcTvgizLFJAxRkEQUF3XVNc1ERF9Xn1SFEWQUh41z/OQJAkYY8pdRTBNE4QQqKrqqDmOAyEEOOcK2Pe9KijLEkIIzPMMAOCcI01T2LZ9Atu2xbquqiCOYwAAYwxJksDzvB/Bty0EQQDf95U+r8CTIM9z6LqOfd+xLAuGYYCUEtu2vQVPAtM0b714Kfgr+IqGf26jhu8pe5wvP5Uh6wYf5FQAAAAASUVORK5CYII=",
    type: "view",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    layout: {
      type: "view",
      resizeMethod: "aspectRatio16by9",
      resizeInterval: null,
      resizeTolerance: null,
      autoResize: true,
      scrolling: false,
      sizeHeight: true,
      sizeWidth: false,
      maxHeight: null,
      maxWidth: null,
      minHeight: null,
      minWidth: null,
      nodeID: "3",
      additionalClasses: [],
      additionalStyles: [],
    },
    name: "Hierachical Cluster Assigner (JavaScript)",
  },
  {
    nodeID: "4",
    availableInView: true,
    description: null,
    icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAABB0lEQVQ4jaWTO26FMBBFL1EkChdUuGYBsAYKehZAAxT0ZgXshM8a2ADboEIWDR2fBho0KaKHZPFICLmdRz7HGmtGA0BEhKf5eAI1TQPLso4z3c04jhSGIQGgF3dbUBQFGYZxwLcFXdeR67oKyDknIcTvgizLFJAxRkEQUF3XVNc1ERF9Xn1SFEWQUh41z/OQJAkYY8pdRTBNE4QQqKrqqDmOAyEEOOcK2Pe9KijLEkIIzPMMAOCcI01T2LZ9Atu2xbquqiCOYwAAYwxJksDzvB/Bty0EQQDf95U+r8CTIM9z6LqOfd+xLAuGYYCUEtu2vQVPAtM0b714Kfgr+IqGf26jhu8pe5wvP5Uh6wYf5FQAAAAASUVORK5CYII=",
    type: "view",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    layout: {
      type: "view",
      resizeMethod: "aspectRatio16by9",
      resizeInterval: null,
      resizeTolerance: null,
      autoResize: true,
      scrolling: false,
      sizeHeight: true,
      sizeWidth: false,
      maxHeight: null,
      maxWidth: null,
      minHeight: null,
      minWidth: null,
      nodeID: "4",
      additionalClasses: [],
      additionalStyles: [],
    },
    name: "Stacked Area Chart (JavaScript)",
  },
  {
    nodeID: "7",
    availableInView: false,
    description: null,
    icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAFo9M/3AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NjAwRUJFNjcwRTFDMTFFNkE3NkZCQjA2REE3QjhBQ0IiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NjAwRUJFNjgwRTFDMTFFNkE3NkZCQjA2REE3QjhBQ0IiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxMzY0M0M1MDBFMTAxMUU2QTc2RkJCMDZEQTdCOEFDQiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo2MDBFQkU2NjBFMUMxMUU2QTc2RkJCMDZEQTdCOEFDQiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PpSP8JMAAAKoSURBVHjaYpCWljJWV1d9zMQABHbTLGQAAogBKPI/bKbPQwb/Prf/QMAAEEBgkZsPbv4/cHL/f78O5xwGkCgMP/YP/A8QQGAVIOzf48oC1nL/2X2Q3v+Zh+LAZjDZmFozZByIY3h68jknyCpGsDIguKJs8FBAV0kOIIDAZiCDR48e/g+d4f0maXsU2AgWkOqW1fUMT8UfMMQJpDPMfzyFgZGZiX2ux1JGFCNBIHiy56l/f//vrKy80s4lJXL9z7fvl1AUwMAFSfXNIubaPn+//WQACCBGDQ31p58/f5ZCkjcxLdFtZGRkeL0uf0ci065du6SePHnKAMPcchxnJIzEvRn+/ecFqWZiYmJmOHThAEJ7jj7D11ff/q0r3BkCVvDv31+GZe/mMSQsC2ZYf2gdA78sL8P72+8NYRoY1dRUHjFJMsjaVVsAvcfI8OLy67sb8rerwI2EhbxXs6Ns8HTvRyD2eQm1zZeV9B+e5JDmwurNJwFBYMEPl+89YmLAAkD+BwFQQAEEGCgcnkRFRUknJCQwgHyEDEAeWLBgAcPChQsf6GQo9/Mr8ndxiXKxv7n69tXqzC3iYE+AIvPkyVPASJXGZhnD06dPGZJmRDHI28oyMLExMby7+fbp90+/TDaX7n4BkmeBKSxZks/wXuQNw593vxjyDCsYjDWNGX78/M7QubeFQdFFnuH/r/8MLy+82ru+YIcLsgWMKirKD+Pi4uR8Ar0ZFl6Yy/BN4jMDCysjw7eXP4CeZGLglGFn+Pbm2/8Pdz9Ubyzd3Y7uQoxQ9G5xUuES5NwhpCagzMTOwvDuzvt3315+ddtcufcsNi9ijQZsAJQCBXVVfJi52OEx8f7ynS1MDEQCFi5OPZhmEACxQWJEu+AUpwwXmwD3SpAmWBr49eFrOABu3kNaCuHSIAAAAABJRU5ErkJggg==",
    type: "quickform",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    layout: {
      type: "view",
      resizeMethod: "viewLowestElement",
      resizeInterval: null,
      resizeTolerance: null,
      autoResize: true,
      scrolling: false,
      sizeHeight: true,
      sizeWidth: false,
      maxHeight: null,
      maxWidth: null,
      minHeight: null,
      minWidth: null,
      nodeID: "7",
      additionalClasses: [],
      additionalStyles: [],
    },
    name: "Boolean Input",
  },
  {
    nodeID: "8",
    availableInView: true,
    description: null,
    icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA3XAAAN1wFCKJt4AAAAB3RJTUUH3gMNDwYK7Pl8VwAAAN1JREFUOMvVkj0KwkAQhb9ZNQb8gYA5goUnECy9ggew9AiexdJ72FiJnZ1gYZELKBJko5ixMCYK/kRSOc3ug7cz770dUVWKVDkPSZZCs9pERFBVDtEB7Wr+BnWnTr/dxyk5nC4nZpvZZwUi8oRbixZ+zU+xG7kpx3x7/JJlXmQgIwEPGCQED3Ry89lYNQj2ARVT4RyfsY7lHn5mwQOGQBWIgGk2JTyGzLdzDIaYGGttpiCVPAY6j8llV+29/2pDwTKqmvphDWyTM/x1kXaJbwPECc6zZEVXuXgG/9/gCm3SQpkbJEazAAAAAElFTkSuQmCC",
    type: "nestedLayout",
    templateId: null,
    layout: {
      nodeID: "8",
      type: "nestedLayout",
    },
    name: "Inner View",
  },
];

export const createResizeColumnInfo = (
  column: LayoutEditorColumn,
): ResizeColumnInfo => ({
  column,
  clientX: 10,
  gridStepWidth: 20,
  originalWidthXS: 30,
});

export const createConfigurationLayout = (): ConfigurationLayout => ({
  rows: [
    {
      type: "row",
      columns: [{ content: [{ nodeID: "1", type: "configuration" }] }],
    },
    {
      type: "row",
      columns: [{ content: [{ nodeID: "7", type: "configuration" }] }],
    },
    {
      type: "row",
      columns: [{ content: [{ nodeID: "2", type: "configuration" }] }],
    },
  ],
});

export const createConfigurationNode = (
  data: DeepPartial<ConfigurationLayoutEditorNode> = {},
): ConfigurationLayoutEditorNode => {
  const base = {
    type: "configuration",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    name: "String Configuration",
    icon: "icon1",
    layout: { type: "configuration", nodeID: "9" },
    nodeID: "9",
    availableInDialog: true,
  };

  return merge(base, data);
};

export const createConfigurationNodes = (): ConfigurationLayoutEditorNode[] => [
  {
    type: "configuration",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    name: "String Configuration",
    icon: "icon1",
    layout: { type: "configuration", nodeID: "9" },
    nodeID: "9",
    availableInDialog: true,
  },
  {
    type: "configuration",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    name: "String Configuration",
    icon: "icon2",
    layout: { type: "configuration", nodeID: "10" },
    nodeID: "10",
    availableInDialog: true,
  },
  {
    type: "configuration",
    templateId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    name: "Boolean Input (legacy)",
    icon: "icon3",
    layout: { type: "configuration", nodeID: "12" },
    nodeID: "12",
    availableInDialog: true,
  },
];
