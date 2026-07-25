import React, { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LandingPage, { Navbar } from "./meridex/components/LandingPage.jsx";
import Dashboard from "./meridex/components/Dashboard.jsx";
import DigitalGlobe from "./meridex/components/DigitalGlobe.jsx";
import { useScrollProgress } from "./meridex/hooks.js";

export default function App() {
  const [view, setView] = useState("landing");
  const [popupMarker, setPopupMarker] = useState(null);
  const scrollProgress = useScrollProgress();

  const handleEnter = useCallback(() => {
    setPopupMarker(null);
    setView("dashboard");
    window.scrollTo(0, 0);
  }, []);

  const handleBack = useCallback(() => {
    setView("landing");
    window.scrollTo(0, 0);
  }, []);

  const handleMarkerClick = useCallback((m) => setPopupMarker(m), []);
  const handlePopupClose = useCallback(() => setPopupMarker(null), []);

  const globe = useMemo(
    () => <DigitalGlobe onMarkerClick={handleMarkerClick} />,
    [handleMarkerClick]
  );

  return (
    <div className="mx-app">
      {/* Scroll progress bar */}
      {view === "landing" && (
        <div className="mx-scroll-bar">
          <div className="mx-scroll-bar-fill" style={{ width: `${scrollProgress * 100}%` }} />
        </div>
      )}

      <Navbar onEnter={view === "dashboard" ? handleBack : handleEnter} inDashboard={view === "dashboard"} />

      <AnimatePresence mode="wait">
        {view === "landing" ? (
          <motion.div key="landing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LandingPage
              onEnter={handleEnter}
              globe={globe}
              popupMarker={popupMarker}
              onMarkerClick={handleMarkerClick}
              onPopupClose={handlePopupClose}
            />
          </motion.div>
        ) : (
          <motion.div key="dashboard"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Dashboard onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
