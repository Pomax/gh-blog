import React from "../lib/vendor/react/react.0.12.min.js";
import WebLog from "./WebLog.jsx";

const settings = globalThis.WebLogSettings;
const id = settings.target || "gh-weblog";
const target = document.getElementById(id);

if (!target) {
  const msg =
    "no target element with id '" + id + "' found to inject gh-weblog into.";
  console.error(msg);
}

React.render(React.createElement(WebLog, settings), target);
