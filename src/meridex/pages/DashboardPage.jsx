import React, { useState } from "react";
import { LeftPanel } from "../LeftPanel";
import { CenterPanel } from "../CenterPanel";
import { RightPanel } from "../RightPanel";
import { useClock } from "../useClock";

export function DashboardPage() {
  const now = useClock(1000);
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  return (
    <>
      <LeftPanel
        timelineFilter={timelineFilter}
        setTimelineFilter={setTimelineFilter}
        selected={selected}
        onSelect={setSelected}
      />
      <CenterPanel now={now} onMarkerClick={setSelected} selectedCode={selected} />
      <RightPanel selected={selected} onClearSelection={() => setSelected(null)} />
    </>
  );
}
