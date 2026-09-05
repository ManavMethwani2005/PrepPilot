/**
 * Formats a Date object to YYYY-MM-DD string
 */
const formatDate = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

/**
 * Adds minutes to an 'HH:MM' 24-hour time string
 */
const addMinutesToTime = (timeStr, minutes) => {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

/**
 * Returns an array of consecutive Date objects between startDate and endDate inclusive
 */
const getDayRange = (startDate, endDate) => {
  const days = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

/**
 * Gets a sensible default start time for a student's preferred period
 */
const getStartTimeForPeriod = (period) => {
  switch (period) {
    case 'MORNING':
      return '09:00';
    case 'AFTERNOON':
      return '14:00';
    case 'EVENING':
      return '17:30';
    case 'NIGHT':
      return '20:00';
    default:
      return '09:00';
  }
};

module.exports = {
  formatDate,
  addMinutesToTime,
  getDayRange,
  getStartTimeForPeriod,
};
