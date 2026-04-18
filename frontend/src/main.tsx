import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppAuthProvider } from "./auth/AppAuthProvider";
import { LocationProvider } from "./components/LocationProvider";
import "./index.css";
import "leaflet/dist/leaflet.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppAuthProvider>
      <LocationProvider>
        <App />
      </LocationProvider>
    </AppAuthProvider>
  </React.StrictMode>
);
