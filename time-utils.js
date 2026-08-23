// Local date/time helpers. Store the user's local calendar date separately from UTC timestamps.
window.getLocalToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

window.getLocalDateTimeISO = (dateString = window.getLocalToday(), now = new Date()) => {
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${dateString}T${hours}:${minutes}:${seconds}.${milliseconds}`;
};

window.getLocalTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

window.getLocalDateParts = (date = new Date()) => ({
    year: date.getFullYear(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0')
});

// Convert a stored ISO/UTC timestamp string to the device's local YYYY-MM-DD.
window.toLocalDateStr = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
