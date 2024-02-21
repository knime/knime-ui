type WebSwingEvent = {
    eventType: string;
    payload: any;
}

type WebSwingEventError = {
    message: string;
    error?: any;
}

type MaybeValidWebSwingEvent = {
    isValid: boolean;
    response: WebSwingEvent | WebSwingEventError;
  };

const REGISTERED_HANDLERS = new Map<string, Function>();
  
const validate = (json: string): MaybeValidWebSwingEvent => {
    try {
      const parsed = JSON.parse(json) as WebSwingEvent;
      return { isValid: true, response: parsed };
    } catch (error) {
      const errorResponse = {
        message: "WebSwing event could not be parsed",
        error,
      };
      return { isValid: false, response: errorResponse };
    }
  };

const base64codes = [
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255, 255, 63,
  52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 0, 255, 255,
  255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 255,
  255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];
  
const getBase64Code = (charCode: any) => {
  if (charCode >= base64codes.length) {
    throw new Error("Unable to parse base64 string.");
  }
  const code = base64codes[charCode];
  if (code === 255) {
    throw new Error("Unable to parse base64 string.");
  }
  return code;
};

const base64ToBytes = (str: any) => {
  if (str.length % 4 !== 0) {
    throw new Error("Unable to parse base64 string.");
  }
  const index = str.indexOf("=");
  if (index !== -1 && index < str.length - 2) {
    throw new Error("Unable to parse base64 string.");
  }
  const missingOctets = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0;
    const n = str.length;
    const result = new Uint8Array(3 * (n / 4));
    let buffer;
  for (let i = 0, j = 0; i < n; i += 4, j += 3) {
    buffer =
      getBase64Code(str.charCodeAt(i)) << 18 |
      getBase64Code(str.charCodeAt(i + 1)) << 12 |
      getBase64Code(str.charCodeAt(i + 2)) << 6 |
      getBase64Code(str.charCodeAt(i + 3));
    result[j] = buffer >> 16;
    result[j + 1] = (buffer >> 8) & 0xFF;
    result[j + 2] = buffer & 0xFF;
  }
  return result.subarray(0, result.length - missingOctets);
};

/**
 * TODO: Register this handler at startup time
 */
export const registerWebSwingEventHandler = (eventName: string, handler: Function) => {
    REGISTERED_HANDLERS.set(eventName, handler);
}

export const webSwingEventHandler = function (rawWebSwingEvent: string) {
    if (typeof rawWebSwingEvent !== "string") {
        consola.error("WebSwing Event Error");
        throw new TypeError("WebSwing Event Error");
    }

    const { isValid, response } = validate(rawWebSwingEvent);
    if (!isValid) {
      throw response;
    }

    const { eventType, payload } = response as WebSwingEvent;
    if (eventType !== "WebSwingEvent") {
        throw new TypeError("WebSwing Event Error");
    }

    try {
      if (REGISTERED_HANDLERS.get(eventType)) {
        const handler = REGISTERED_HANDLERS.get(eventType);
        const base64 = base64ToBytes(payload);
        // @ts-ignore
        handler(base64);
        return;
      }
      // TODO: This is crap, this shouldn't happen
      console.log("We don't have a handler for: ", eventType); // eslint-disable-line
    } catch (error) {
      consola.error("WebSwing event handler error", error);
    }
};
