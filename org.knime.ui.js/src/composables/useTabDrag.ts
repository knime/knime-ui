import type { Ref } from "vue";

import type { Project } from "@/api/gateway-api/generated-api.ts";
import { useApplicationStore } from "@/store/application/application.ts";

let draggedTabIndex = -1;
let originalOpenProjects: Project[]; // so we can restore original order whe drag is aborted
const transparentImg = new Image();
transparentImg.src =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
let tabWidths: number[] = [];
let tabsOffsetX = 0;
let widthDragged = 0;
let dragImage: HTMLElement | null;
let initialMouseOffsetX = 0;
let maxDraggedLeft = 0;
let lastDragImageX = 0;

const onDocumentDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const sumReducer = (accumulator: number, current: number) =>
  accumulator + current;

export const useTabDrag = (
  tabWrapper: Ref<HTMLElement | null>,
  openProjects: any,
) => {
  const onDragStart = (e: DragEvent, index: number) => {
    if (tabWrapper.value === null) {
      return;
    }
    originalOpenProjects = [...openProjects.value];
    draggedTabIndex = index;

    let draggedTabRect = {} as DOMRect;
    Array.from(tabWrapper.value.children).forEach((child, childIndex) => {
      const childRect = child.getBoundingClientRect();
      tabWidths.push(childRect.width);
      if (childIndex === index) {
        draggedTabRect = childRect;
      }
    });
    widthDragged = tabWidths[draggedTabIndex];
    tabsOffsetX = tabWrapper.value.getBoundingClientRect().left;
    initialMouseOffsetX = e.clientX - draggedTabRect.left;
    maxDraggedLeft =
      tabWidths.reduce(sumReducer, 0) + tabsOffsetX - widthDragged;

    const eventTargetElement = e.target as HTMLElement;
    // Create custom drag image
    dragImage = eventTargetElement.cloneNode(true) as HTMLElement;
    dragImage.classList.add("drag-image");
    dragImage.style.top = `${draggedTabRect.top}px`;
    dragImage.style.left = `${draggedTabRect.left}px`;
    document.body.appendChild(dragImage);
    // Hide dragged tab during drag
    eventTargetElement.classList.add("dragged-tab");

    if (e.dataTransfer !== null) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setDragImage(transparentImg, 0, 0); // hide default drag image
    }

    // Make everywhere in AP window valid drag target (so drag is not aborted when dropping outside AppHeader)
    document.addEventListener("dragover", onDocumentDragOver);
  };

  const onDrag = (e: DragEvent) => {
    e.preventDefault();
    if (draggedTabIndex === null) {
      return;
    }

    // fix drag image x pos relative to mouse, constrained by first and last possible tab position
    if (dragImage) {
      lastDragImageX =
        e.clientX === 0 // can happen at end of drag
          ? lastDragImageX
          : Math.min(
              Math.max(e.clientX - initialMouseOffsetX, tabsOffsetX),
              maxDraggedLeft,
            );
      dragImage.style.left = `${lastDragImageX}px`;
    }

    // from x pos of mouse, find tab over which we drag, even if we are outside AppHeader
    const relativeMouseX = e.clientX - tabsOffsetX;
    let tabOverIndex = -1;
    let sum = 0;
    let counter = -1;
    while (sum <= relativeMouseX) {
      counter++;
      sum += tabWidths[counter];
      tabOverIndex = counter;
    }
    if (draggedTabIndex === tabOverIndex) {
      return;
    }

    // make sure to only swap if dragged tab will be under mouse after swap
    const isDraggingLeftToRight = draggedTabIndex < tabOverIndex;
    const sumWidthsLeftAfterSwap = isDraggingLeftToRight
      ? tabWidths.slice(0, tabOverIndex + 1).reduce(sumReducer, 0) -
        widthDragged
      : tabWidths.slice(0, tabOverIndex).reduce(sumReducer, 0);
    const newCenterDragged = sumWidthsLeftAfterSwap + widthDragged / 2;
    const canSwap =
      Math.abs(newCenterDragged - relativeMouseX) < widthDragged / 2;
    if (canSwap) {
      const newOpenProjects = [...openProjects.value];
      const draggedItem = newOpenProjects[draggedTabIndex];
      newOpenProjects.splice(draggedTabIndex, 1);
      newOpenProjects.splice(tabOverIndex, 0, draggedItem);

      openProjects.value = newOpenProjects;
      draggedTabIndex = tabOverIndex;
    }
  };

  const onDragEnd = async (e: DragEvent) => {
    // cleanup
    (e.target as HTMLElement).classList.remove("dragged-tab");
    tabWidths = [];
    if (dragImage) {
      document.body.removeChild(dragImage);
      dragImage = null;
    }
    document.removeEventListener("dragover", onDocumentDragOver);

    // Check if drag was canceled (ESC pressed)
    if (e.dataTransfer?.dropEffect === "none") {
      openProjects.value = originalOpenProjects;
    }
    await useApplicationStore().updateOpenProjectsOrder(openProjects.value);
  };

  return { onDragStart, onDrag, onDragEnd };
};
