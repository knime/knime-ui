type ServerEvent = { eventType: string; payload: any };

type ServerEventError = {
  message: string;
  error?: any;
};

type MaybeValidServerEvent = {
  isValid: boolean;
  response: ServerEvent | ServerEventError;
};

const GENERIC_ERROR_MESSAGE = "Argument must be a JSON serialized event object";

const COMPOSITE_EVENT_NAME = "CompositeEvent";

const REGISTERED_HANDLERS = new Map<string, Function>();

const tryParse = (json: string): MaybeValidServerEvent => {
  try {
    const parsed = JSON.parse(json) as ServerEvent;
    return { isValid: true, response: parsed };
  } catch (error) {
    const errorResponse = {
      message: "Server event could not be parsed",
      error,
    };
    return { isValid: false, response: errorResponse };
  }
};

const isCompositeEvent = (method: string) => method.includes(":");

const getCompositeEvents = (method: string) => method.split(":");

const validateCompositeEvents = (eventType: string) => {
  const methods = getCompositeEvents(eventType);

  const isRegistered = (_method: string) =>
    Boolean(REGISTERED_HANDLERS.get(_method));
  const isFunction = (_method: string) =>
    typeof REGISTERED_HANDLERS.get(_method) === "function";

  const hasRegisteredCompositeEventHandler =
    isRegistered(COMPOSITE_EVENT_NAME) && isFunction(COMPOSITE_EVENT_NAME);

  return (
    hasRegisteredCompositeEventHandler &&
    methods.every((_method) => isRegistered(_method) && isFunction(_method))
  );
};

const validateMethod = (data: MaybeValidServerEvent): MaybeValidServerEvent => {
  if (!data.isValid) {
    return data;
  }

  const { eventType } = data.response as ServerEvent;

  const isValid = isCompositeEvent(eventType)
    ? validateCompositeEvents(eventType)
    : Boolean(REGISTERED_HANDLERS.get(eventType)) &&
      typeof REGISTERED_HANDLERS.get(eventType) === "function";

  const response = isValid
    ? data.response
    : { message: `Method handler for "${eventType}" not found` };

  return { isValid, response };
};

const validate = (json: string): MaybeValidServerEvent => {
  const maybeParsed = tryParse(json);
  const maybeMethodFound = validateMethod(maybeParsed);

  return maybeMethodFound;
};

export const getRegisteredEventHandler = (eventName: string) =>
  REGISTERED_HANDLERS.get(eventName);

export const registerEventHandler = (eventName: string, handler: Function) => {
  REGISTERED_HANDLERS.set(eventName, handler);
};

export const serverEventHandler = function (rawServerEvent: string) {
  if (typeof rawServerEvent !== "string") {
    consola.error(GENERIC_ERROR_MESSAGE);
    throw new TypeError(GENERIC_ERROR_MESSAGE);
  }

  const { isValid, response } = validate(rawServerEvent);
  if (!isValid) {
    consola.error("serverEventHandler:: Invalid server event");
    throw response;
  }

  consola.info("serverEventHandler:: Event", response);

  const { eventType, payload } = response as ServerEvent;
  try {
    const handlerName = isCompositeEvent(eventType)
      ? COMPOSITE_EVENT_NAME
      : eventType;

    const handlerParams = isCompositeEvent(eventType)
      ? {
          events: getCompositeEvents(eventType),
          params: payload.events,
          eventHandlers: REGISTERED_HANDLERS,
        }
      : payload;

    // note the (!) at the end of the statement -> we can guarantee existence
    // of handler since it was already validated
    const handler = REGISTERED_HANDLERS.get(handlerName)!;

    handler(handlerParams);
  } catch (error) {
    consola.error("serverEventHandler::Error", error);
  }
};
