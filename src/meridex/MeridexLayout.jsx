import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "./Sidebar";
import { AlertEngine } from "./AlertEngine";

export function MeridexLayout() {
  return (
    <main className="meridex-root" data-testid="meridex-root">
      <Sidebar />
      <div className="mx-grid mx-grid-flex">
        <Outlet />
      </div>
      {/* Headless engine that fires toasts when active alerts cross threshold */}
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
