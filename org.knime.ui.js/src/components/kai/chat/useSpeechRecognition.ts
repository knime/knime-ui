import { ref } from "vue";
import type { Ref } from "vue";

// DO NOT USE THIS, this api is only working on google chrome as google provides
// the transcription service and other vendors would have to pay for it + the audio data is sent to google.

const useSpeechRecognition = (
  input: Ref<String>,
  onResultCallback: Function,
  options?: {
    interimResults?: boolean;
    maxAlternatives?: number;
    continuous?: boolean;
  },
) => {
  // Check if the browser supports the microphone permission. For some odd reason
  // the type of the permission is not defined in the typescript definition as
  // not all browsers support the microphone permission.
  const permissionName = "microphone" as any;
  const microphonePermission = navigator.permissions
    .query({ name: permissionName })
    .then((permissionStatus) => {
      if (permissionStatus.state === "granted") {
        return true;
      } else {
        return false;
      }
    });
  if (!microphonePermission) {
    return { error: "Microphone permission not granted" };
  }
  const ongoingSpeechRecognition = ref(false);
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = options?.continuous || false;
  // if not set the default of the locale of your browser is used
  // recognition.lang = "en-US";
  recognition.interimResults = options?.interimResults || true;
  recognition.maxAlternatives = options?.maxAlternatives || 1;

  recognition.onspeechend = function () {
    recognition.stop();
    ongoingSpeechRecognition.value = false;
  };

  recognition.onerror = function (event) {
    consola.error(`Error occurred in recognition: ${event.error}`);
  };

  recognition.onresult = function (event) {
    input.value = event.results[0][0].transcript;
  };

  const startSpeechRecognition = () => {
    recognition.start();
    ongoingSpeechRecognition.value = true;
  };

  const stopSpeechRecognition = () => {
    recognition.stop();
    ongoingSpeechRecognition.value = false;
    onResultCallback();
  };
  return {
    startSpeechRecognition,
    stopSpeechRecognition,
    ongoingSpeechRecognition,
  };
};

export { useSpeechRecognition };
