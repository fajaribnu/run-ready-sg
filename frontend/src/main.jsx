import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ShelterMap from "./pages/ShelterMap";
import RoutePlanner from "./pages/RoutePlanner";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    {/* <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/shelter" element={<ShelterMap />} />
        <Route path="/routes" element={<RoutePlanner />} />
      </Routes>
    </BrowserRouter> */}
  </React.StrictMode>
);
