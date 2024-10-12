const { pathname, host } = location;
const suffix = pathname.lastIndexOf("/") === pathname.length - 1 ? pathname : "/";
const loc = host + suffix;
const settingsName = `gh-weblog-settings-${loc}`;

export const WebLogSettings = {
  getSettings() {
    const settings = localStorage[settingsName];
    if (!settings) return {};
    return JSON.parse(settings);
  },

  saveSettings(settings) {
    localStorage[settingsName] = JSON.stringify(settings);
  },

  clearSettings() {
    localStorage.removeItem(settingsName);
  },
};

export default WebLogSettings;
