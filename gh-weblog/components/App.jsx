import React from "../lib/vendor/react/react.0.12.min.js";
import WebLog from "./WebLog.jsx";
import WebLogSettings from "../lib/weblogsettings.js";

const settings = WebLogSettings.getSettings();
const id = settings.target || "gh-weblog";
const target = document.getElementById(id);

if (!target) {
  const msg = `no target element with id '${id}' found to inject gh-weblog into.`;
  console.error(msg);
} else {
  React.render(React.createElement(WebLog, settings), target);
}
