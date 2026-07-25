import React, { useState } from "react";
import HomePage from "./meridex/pages/HomePage.jsx";

export default function App() {
  const [view, setView] = useState("home");
  return <HomePage onEnter={() => setView("dashboard")} />;
}
