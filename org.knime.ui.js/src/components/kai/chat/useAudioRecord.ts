
import { type Ref, computed, nextTick, ref } from "vue";

export const useAudioRecorder = (textInput: Ref<string>) => {
  const isRecording = ref(false);
  const elapsedTime = ref(0);
  const audioBlob = ref<Blob | null>(null);
  const error = ref<Error | null>(null);

  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let timerId: number | null = null;

  const isRecordingProcessing = ref(false);

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      consola.debug("Stopping recording");
      mediaRecorder.stop();
    }
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const startRecording = async () => {
    if (isRecording.value) {
      consola.warn("Recording is already in progress");
      return;
    }
    consola.debug("Starting recording");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isRecording.value = true;
      elapsedTime.value = 0;
      audioChunks = [];

      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

      mediaRecorder.onstop = async () => {
        consola.debug("Recording stopped");
        const mimeType = mediaRecorder!.mimeType;
        audioBlob.value = new Blob(audioChunks, { type: mimeType });
        isRecording.value = false;
        stream.getTracks().forEach((track) => track.stop());

        const formData = new FormData();
        formData.append("file", audioBlob.value);

        // speech-to-text backend easily available via https://github.com/mudler/LocalAI
        // OpenAi compatible API, MIT license, easily exchangeable with other models
        formData.append("model", "whisper-1");
        isRecordingProcessing.value = true;
        const response = await fetch(
          "http://localhost:8080/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              accept: "application/json",
              // "Content-Type": "multipart/form-data",
            },
            body: formData,
          },
        );

        const data = await response.json();

        isRecordingProcessing.value = false;
        await nextTick();
        textInput.value += data?.text;
      };

      mediaRecorder.onerror = (event) => {
        error.value = new Error(`Recording error: ${event}`);
        stopRecording();
      };

      timerId = window.setInterval(() => {
        elapsedTime.value++;
      }, 1000);

      mediaRecorder.start();
    } catch (err) {
      error.value = err as Error;
      isRecording.value = false;
    }
  };

  return {
    busy : computed(() => isRecording.value || isRecordingProcessing.value),
    isRecording,
    elapsedTime,
    audioBlob,
    error,
    startRecording,
    stopRecording,
  };
};
