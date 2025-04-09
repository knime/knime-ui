/* eslint-disable complexity */
/* eslint-disable no-magic-numbers */
/**
 * A utility function for parsing a human readable interval string from a provided schedule configuration.
 * Provides a fallback interval string if not enough information is available to parse the schedule or an error
 * occurs during parsing.
 *
 * @param {Object} schedule - the schedule (not scheduled job, but the schedule field of the job) for which to
 *      try and parse a human-readable interval.
 * @param {String} [schedule.endTime] - the optional end of the scheduled interval of execution.
 * @param {String} [schedule.delayType] - the optional unit of the schedule's recurrence period.
 * @param {Number} [schedule.delay] - the optional value of the schedule delayType.
 * @param {Object} [schedule.filter] - the optional filter configuration for the schedule.
 * @param {Number[]} [schedule.filter.days] - the optional array containing the numeric days of the month the
 *      schedule should execute.
 * @param {Number[]} [schedule.filter.daysOfWeek] - the optional array containing the numeric days of the week the
 *      schedule should execute.
 * @returns {String} interval - the human readable interval that was parsed from the schedule provided.
 */
export const getIntervalFromSchedule = (schedule: any) => {
  if (!schedule?.startTime) {
    return "-";
  }
  let interval = "Custom interval";
  try {
    // for a single, scheduled future execution
    if (!schedule?.filter && !schedule?.delay) {
      return "Once";
    }

    // minutes, hours, days
    const delayUnit = schedule.delayType.toLowerCase();
    // singularize for proper english
    const parsedUnit =
      schedule.delay === 1 && delayUnit.endsWith("s")
        ? delayUnit.slice(0, -1)
        : delayUnit;
    let frequency;
    if (schedule.delay === 1) {
      if (parsedUnit === "day") {
        frequency = "Daily";
      } else if (parsedUnit === "hour") {
        frequency = "Hourly";
      } else {
        frequency = "Every minute";
      }
    } else {
      frequency = `Every ${schedule.delay} ${parsedUnit}`;
    }

    let hasExceptions = false;

    const startTimeHour = Object.values(schedule.filter?.times?.[0]?.start)[0];
    const startTimeMinutes = Object.values(
      schedule.filter?.times?.[0]?.start,
    )[1];
    const isStartTimeException = startTimeHour !== 0 || startTimeMinutes !== 0;
    const endTimeHour = Object.values(schedule.filter?.times?.[0]?.end)[0];
    const endTimeMinutes = Object.values(schedule.filter?.times?.[0]?.end)[1];
    const endTimeSeconds = Object.values(schedule.filter?.times?.[0]?.end)[2];
    const isEndTimeException =
      endTimeHour !== 23 || endTimeMinutes !== 59 || endTimeSeconds !== 59;

    // Check for exceptions
    if (schedule.filter?.times?.length > 1) {
      // custom time intervals *or* specific execution times
      hasExceptions = true;
    } else if (isStartTimeException || isEndTimeException) {
      // non-default start or end times
      hasExceptions = true;
    } else if (schedule.filter?.daysOfWeek?.length !== 7) {
      // excludes certain days of the week
      hasExceptions = true;
    } else if (schedule.filter?.days?.length < 31) {
      // excludes certain days of the month
      hasExceptions = true;
    } else if (
      schedule.filter?.days?.length === 31 &&
      Array.from(Array(31)).some(
        (x, i) => !schedule.filter?.days.includes(i + 1),
      )
    ) {
      // has day '32' (symbolic for 'last') and is missing a different day
      hasExceptions = true;
    } else if (schedule.filter?.months?.length !== 12) {
      // excludes certain months
      hasExceptions = true;
    }

    if (hasExceptions) {
      frequency += " with exceptions";
    }
    interval = frequency;
  } catch (_e) {
    // do nothing
  }
  return interval;
};
