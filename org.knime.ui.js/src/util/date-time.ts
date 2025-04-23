export const addLeadingZero = (value: number) =>
  // eslint-disable-next-line no-magic-numbers
  value < 10 ? `0${value}` : value;

export const formatTime = (timeInMs: number) => {
  const formattedTime = new Date(timeInMs * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedHour = new Date(timeInMs * 1000).getHours();
  const formattedMinute = new Date(timeInMs * 1000).getMinutes();

  return `${formattedTime}, ${formattedHour}:${addLeadingZero(
    formattedMinute,
  )}`;
};

export const isValidDate = (dateString: string) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};
