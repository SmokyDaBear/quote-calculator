import { useState, useMemo } from "react";
import { getJobTemplates } from "../storage";

function ServiceRecommendations({ mileage, jobs, onApplyTemplate }) {
  const [templates] = useState(() => getJobTemplates());

  const recommendations = useMemo(() => {
    const m = Number(mileage);
    if (!m) return [];
    return templates
      .filter((t) => t.mileageInterval != null && t.mileageInterval <= m + 1000)
      .map((t) => ({
        ...t,
        status: t.mileageInterval <= m ? "due" : "upcoming",
      }))
      .sort((a, b) => a.mileageInterval - b.mileageInterval);
  }, [mileage, templates]);

  const addedNames = useMemo(
    () => new Set(jobs.map((j) => j.name.trim().toLowerCase())),
    [jobs],
  );

  if (recommendations.length === 0) return null;

  return (
    <div className="service-rec-panel">
      <div className="service-rec-header">
        <span className="service-rec-title">Service Recommendations</span>
        <span className="service-rec-subtitle">
          Based on {Number(mileage).toLocaleString()} mi
        </span>
      </div>
      <div className="service-rec-scroll">
        {recommendations.map((rec) => {
          const added = addedNames.has(rec.name.trim().toLowerCase());
          return (
            <div
              key={rec.id}
              className={`service-rec-card service-rec-card--${rec.status}${added ? " service-rec-card--added" : ""}`}
            >
              <span className={`service-rec-tag service-rec-tag--${rec.status}`}>
                {rec.status === "due" ? "Due" : "Upcoming"}
              </span>
              <div className="service-rec-name">{rec.name}</div>
              {rec.description && (
                <div className="service-rec-desc">{rec.description}</div>
              )}
              <div className="service-rec-miles">
                {Number(rec.mileageInterval).toLocaleString()} mi
              </div>
              <button
                className="btn-small btn-success service-rec-btn"
                onClick={() => onApplyTemplate(rec)}
                disabled={added}
              >
                {added ? "Added" : "Add to Quote"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ServiceRecommendations;
