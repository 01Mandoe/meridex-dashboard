import React from "react";

export function Sparkline({ data, color, width = 70, height = 22 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function StatTile({ label, value, trend, color }) {
  return (
    <div className="mx-stat-tile">
      <div className="mx-stat-label">{label}</div>
      <div className="mx-stat-row">
        <div className="mx-stat-value" style={{ color }}>{value}</div>
        <div className="mx-stat-spark">
          <Sparkline
            data={trend === "up" ? [3, 5, 4, 7, 6, 9, 8, 11] : [11, 8, 9, 7, 5, 6, 4, 3]}
            color={color}
            width={50}
            height={18}
          />
        </div>
      </div>
    </div>
  );
}

export function BottomStat({ Icon, value, label }) {
  return (
    <div className="mx-bstat" data-testid={`bstat-${label.toLowerCase()}`}>
      <div className="mx-bstat-icon">
        <Icon size={16} strokeWidth={2} />
      </div>
      <div>
        <div className="mx-bstat-value">{value}</div>
        <div className="mx-bstat-label">{label}</div>
      </div>
    </div>
  );
}
