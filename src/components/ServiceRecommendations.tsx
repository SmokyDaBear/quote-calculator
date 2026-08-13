import { useState, useEffect, useMemo } from "react";
import { getJobTemplates } from "../storage";
import type { JobTemplate } from "../types/index";
import HorizontalScrollContainer from "./HorizontalScrollContainer";

type TemplateWithMileage = JobTemplate & { mileageInterval?: number };

function ServiceRecommendations({
  mileage,
  jobs,
  onApplyTemplate,
}: {
  mileage: string;
  jobs: Array<{ name: string }>;
  onApplyTemplate: (template: JobTemplate) => void | Promise<void>;
}) {
  const hasSlots = (t: JobTemplate) =>
    (t.parts || []).some((p) => p.type === "category");

  const [templates, setTemplates] = useState<TemplateWithMileage[]>([]);

  useEffect(() => {
    getJobTemplates().then((all) => setTemplates(all as TemplateWithMileage[]));
  }, []);

  const recommendations = useMemo(() => {
    const m = Number(mileage);
    if (!m) return [];
    return templates
      .filter((t) => t.mileageInterval != null && t.mileageInterval <= m + 1000)
      .map((t) => ({
        ...t,
        status: (t.mileageInterval ?? 0) <= m ? "due" : "upcoming",
      }))
      .sort((a, b) => (a.mileageInterval ?? 0) - (b.mileageInterval ?? 0));
  }, [mileage, templates]);

  const addedNames = useMemo(
    () => new Set(jobs.map((j) => j.name.trim().toLowerCase())),
    [jobs],
  );

  const pending = useMemo(
    () => recommendations.filter((r) => !addedNames.has(r.name.trim().toLowerCase())),
    [recommendations, addedNames],
  );

  const handleAddAll = async () => {
    // Awaited one at a time: templates with category slots open a picker, and
    // firing them all at once would leave every prompt but the last unanswered.
    for (const rec of pending) await onApplyTemplate(rec);
  };

  if (recommendations.length === 0) return null;

  return (
    <div className="service-rec-panel">
      <div className="service-rec-header">
        <h3 className="section-heading">Service Recommendations</h3>
        <span className="service-rec-subtitle">
          Based on {Number(mileage).toLocaleString()} mi
        </span>
        <button
          type="button"
          className="btn-small btn-secondary service-rec-refresh-btn"
          onClick={() => {
            getJobTemplates().then((all) =>
              setTemplates(all as TemplateWithMileage[]),
            );
          }}
        >
          Refresh
        </button>
        <button
          type="button"
          className="btn-small btn-secondary service-rec-add-all-btn"
          onClick={handleAddAll}
          disabled={pending.length === 0}
          title={
            pending.some(hasSlots)
              ? "Templates with flexible parts will ask you to pick each one"
              : undefined
          }
        >
          Add All{pending.length > 0 ? ` (${pending.length})` : ""}
        </button>
      </div>
      <HorizontalScrollContainer
        hideScrollbar={false}
        trackClassName="service-rec-scroll"
      >
        {recommendations.map((rec) => {
          const added = addedNames.has(rec.name.trim().toLowerCase());
          return (
            <div
              key={rec.id}
              className={`service-rec-card service-rec-card--${rec.status}${added ? " service-rec-card--added" : ""}`}
            >
              <span
                className={`service-rec-tag service-rec-tag--${rec.status}`}
              >
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
                type="button"
                className="btn-small btn-success service-rec-btn"
                onClick={() => onApplyTemplate(rec)}
                disabled={added}
              >
                {added ? "Added" : "Add to Quote"}
              </button>
            </div>
          );
        })}
      </HorizontalScrollContainer>
    </div>
  );
}

export default ServiceRecommendations;
