var dayjs = require("dayjs");

export function formatDatetime(timestamp) {
  let d = dayjs(timestamp);
  if (timestamp) {
    if (d.year() < dayjs().year()) return d.format("D MMM'YY HH:mm");
    if (d.add(1, "days").isBefore(dayjs())) return d.format("D MMM HH:mm");
    return d.fromNow();
  }
}

export function formatDate(timestamp) {
  let d = dayjs(timestamp);
  if (timestamp) {
    if (d.year() < dayjs().year()) return d.format("D MMM'YY");
    if (d.add(1, "days").isBefore(dayjs())) return d.format("D MMM");
    return d.fromNow();
  }
}
