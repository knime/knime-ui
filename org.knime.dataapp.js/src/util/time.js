// eslint-disable-next-line no-magic-numbers
export const addLeadingZero = (number) => (number < 10 ? `0${number}` : number);

export const getTimeParts = (timeInMs) => {
  /* eslint-disable no-magic-numbers */
  let millisecond = timeInMs % 1000;
  timeInMs = (timeInMs - millisecond) / 1000;
  let second = timeInMs % 60;
  timeInMs = (timeInMs - second) / 60;
  let minute = timeInMs % 60;
  let hour = (timeInMs - minute) / 60;
  /* eslint-enable no-magic-numbers */
  return {
    hour,
    minute,
    second,
    millisecond,
  };
};

export const formatTime = (timeInMs) => {
  const { hour, minute, second } = getTimeParts(timeInMs);

  return `${addLeadingZero(hour)}:${addLeadingZero(minute)}:${addLeadingZero(second)}`;
};

export const formatSemanticTime = (milliseconds) => {
  const timeParts = getTimeParts(milliseconds);

  // Only show milliseconds if there's nothing else
  if (timeParts.second || timeParts.minute || timeParts.hour) {
    delete timeParts.millisecond;
  }
  let parts = [];
  for (let key in timeParts) {
    const value = timeParts[key];
    if (value || key === "millisecond") {
      parts.push(`${value} ${key}${value > 1 ? "s" : ""}`);
    }
  }
  return parts.join(", ");
};
