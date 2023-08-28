// eslint-disable-next-line no-magic-numbers
export const addLeadingZero = (number) => (number < 10 ? `0${number}` : number);

export const formatTime = (timeInMs) => {
  const formattedTime = new Date(timeInMs * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedHour = new Date(timeInMs * 1000).getHours();
  const formattedMinute = new Date(timeInMs * 1000).getMinutes();

  return `${formattedTime}, ${formattedHour}:${addLeadingZero(
    formattedMinute,
  )}`;
};
