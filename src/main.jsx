import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { prepareRecoveryLocation } from "./lib/passwordRecovery";

prepareRecoveryLocation(window.location, window.history);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
