import mitt, { type Handler } from "mitt";

type LifecycleEvents = {
  /**
   * Called before a workflow is about to be unloaded from the state
   * and all change events from it are unsubscribed
   */
  beforeUnloadWorkflow: undefined;
  /**
   * Called before a workflow is loaded into the state
   */
  beforeLoadWorkflow: undefined;
  /**
   * Called after the data of the loaded workflow has been received and
   * the workflow has been successfully rendered
   */
  onWorkflowLoaded: undefined;
};

const _bus = mitt<LifecycleEvents>();

/**
 * Attach an event listener and execute it only once. The handler will be
 * automatically removed once the event fires.
 */
const once = <Key extends keyof LifecycleEvents>(
  type: Key,
  handler: Handler<LifecycleEvents[Key]>,
) => {
  const innerHandler = (event: LifecycleEvents[Key]) => {
    handler(event);
    _bus.off(type, innerHandler);
  };

  _bus.on(type, innerHandler);
};

export const lifecycleBus = {
  ..._bus,
  once,
};
