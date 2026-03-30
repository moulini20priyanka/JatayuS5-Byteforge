import React from 'react';

export default function StatCard({ label, value, description, accent }) {
  const accentClass = {
    blue: 'stat-card-accent',
    green: 'stat-card-accent-green',
    red: 'stat-card-accent-red',
    yellow: 'stat-card-accent-yellow',
  }[accent] || 'stat-card-accent';

  return (
    <div className={`stat-card ${accentClass}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {description && <div className="stat-card-desc">{description}</div>}
    </div>
  );
}
