export default {
  settingsName: (function () {
    var loc = location.host;
    var path = location.pathname;
    loc += path.lastIndexOf("/") === path.length - 1 ? path : "/";
    return "gh-weblog-settings-" + loc;
  })(),

  getSettings: function () {
    var settings = localStorage[this.settingsName];
    if (!settings) return false;
    return JSON.parse(settings);
  },

  saveSettings: function (settings) {
    localStorage[this.settingsName] = JSON.stringify(settings);
  },

  clearSettings: function () {
    localStorage.removeItem(this.settingsName);
  },
};
