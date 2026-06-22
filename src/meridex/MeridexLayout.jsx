import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "./Sidebar";
import { AlertEngine } from "./AlertEngine";

export function MeridexLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <main className="meridex-root" data-testid="meridex-root">
      {!isHome && <Sidebar />}
      <div className={`mx-grid ${isHome ? "" : "mx-grid-flex"}`}>
        <Outlet />
      </div>
      <AlertEngine />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(8, 14, 24, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            color: "#e6ecf5",
            backdropFilter: "blur(8px)",
          },
        }}
      />
    </main>
  );
}
