import React from "react";

export function ComingSoonPage({ title, sub }) {
  return (
    <section className="mx-page" data-testid="page-coming-soon">
      <div className="mx-page-header">
        <div>
          <div className="mx-page-title">{title}</div>
          <div className="mx-page-sub">{sub}</div>
        </div>
      </div>
      <div className="mx-card mx-page-card mx-coming-soon">
        <div className="mx-coming-title">Coming soon</div>
        <div className="mx-coming-sub">
          This module is on the roadmap. The data layer (SSE feed + globe markers) is already in place,
          so wiring this page up is a small lift.
        </div>
      </div>
    </section>
  );
}
