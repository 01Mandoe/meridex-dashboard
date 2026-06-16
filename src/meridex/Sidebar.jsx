import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Newspaper, LineChart,
  Bell, Star, Activity, Settings, Globe2,
} from "lucide-react";

const NAV = [
  { name: "Dashboard", to: "/",          Icon: LayoutDashboard },
  { name: "Calendar",  to: "/calendar",  Icon: Calendar },
  { name: "News",      to: "/news",      Icon: Newspaper },
  { name: "Markets",   to: "/markets",   Icon: LineChart },
  { name: "Alerts",    to: "/alerts",    Icon: Bell },
  { name: "Watchlist", to: "/watchlist", Icon: Star },
  { name: "Analytics", to: "/analytics", Icon: Activity },
  { name: "Settings",  to: "/settings",  Icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="mx-sidebar" data-testid="sidebar">
      <div className="mx-sidebar-logo">
        <div className="mx-logo-mark">
          <Globe2 size={18} strokeWidth={2.2} />
        </div>
        <div className="mx-logo-text">Meri<span>dex</span></div>
      </div>
      <nav className="mx-sidebar-nav">
        {NAV.map(({ name, to, Icon }) => (
          <NavLink
            key={name}
            to={to}
            end={to === "/"}
            data-testid={`nav-${name.toLowerCase()}`}
            className={({ isActive }) => `mx-nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
