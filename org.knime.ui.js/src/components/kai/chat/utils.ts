const isSameDay = (timestamp1: number, timestamp2: number): boolean => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

const isToday = (timestamp: number): boolean => {
  return isSameDay(timestamp, Date.now());
};

const isYesterday = (timestamp: number): boolean => {
  const now = new Date();
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  return isSameDay(timestamp, yesterday.getTime());
};

export { isToday, isYesterday, isSameDay };
