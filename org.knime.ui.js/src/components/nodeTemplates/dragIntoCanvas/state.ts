// This features needs to share state between the dragStart and the onDrop interactions
// which are not bound/called at the same location in the code.
// This is because the drag start handler, which mainly manipulates that event, will likely
// be bound at a separate location than the onDrag.

let dragStartTime: number | null;

export const dragTime = {
  isSet: () => dragStartTime !== null,
  update: (value: number) => (dragStartTime = value),
  get: () => {
    if (!dragStartTime) {
      throw new Error("dragStartTime value needs to be initialized");
    }

    return dragStartTime;
  },
  reset: () => (dragStartTime = null),
};
