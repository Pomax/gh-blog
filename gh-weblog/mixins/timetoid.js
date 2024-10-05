/**
 * Convert "seconds since epoch" timestamps into yyyy-mm-dd-hh-mm-ss format string ids
 */
export default {
  timeToId: function (timestamp) {
    if (!timestamp) return false;
    var d = new Date(parseInt(timestamp, 10));
    var s = d.toISOString();
    var id = s.replace("T", "-").replace(/\..*/, "").replace(/\:/g, "-");
    return id;
  },
};
