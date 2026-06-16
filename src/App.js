import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MeridexLayout } from "@/meridex/MeridexLayout";
import { DashboardPage } from "@/meridex/pages/DashboardPage";
import { CalendarPage } from "@/meridex/pages/CalendarPage";
import { NewsPage } from "@/meridex/pages/NewsPage";
import { MarketsPage } from "@/meridex/pages/MarketsPage";
import { AlertsPage } from "@/meridex/pages/AlertsPage";
import { WatchlistPage } from "@/meridex/pages/WatchlistPage";
import { SettingsPage } from "@/meridex/pages/SettingsPage";
import { ComingSoonPage } from "@/meridex/pages/ComingSoonPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MeridexLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/analytics" element={<ComingSoonPage title="Analytics" sub="Backtesting, correlation matrices, regime detection" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
