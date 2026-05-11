import { useState, useEffect, useMemo } from "react";
import { getJobTemplates } from "../storage";
import type { JobTemplate } from "../types/index";
import HorizontalScrollContainer from "./HorizontalScrollContainer";

function QuickJobs({ jobs, onApplyTemplate }: {
  jobs: Array<{ name: string }>;
  onApplyTemplate: (template: JobTemplate) => void;
}) {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);

  useEffect(() => {
    getJobTemplates().then((all) =>
      setTemplates(all.filter((t) => (t as unknown as { quickJob?: boolean }).quickJob === true)),
    );
  }, []);

  const addedNames = useMemo(
    () => new Set(jobs.map((j) => j.name.trim().toLowerCase())),
    [jobs],
  );

  if (templates.length === 0) return null;

  return (
    <div className="service-rec-panel">
      <div className="service-rec-header">
        <span className="service-rec-title">Quick Jobs</span>
        <span className="service-rec-subtitle">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </span>
      </div>
      <HorizontalScrollContainer hideScrollbar={true} trackClassName="service-rec-scroll">
        {templates.map((t) => {
          const added = addedNames.has(t.name.trim().toLowerCase());
          return (
            <div
              key={t.id}
              className={`service-rec-card${added ? " service-rec-card--added" : ""}`}
            >
              <div className="service-rec-name">{t.name}</div>
              {t.description && (
                <div className="service-rec-desc">{t.description}</div>
              )}
              {(Number(t.laborCost) > 0 || t.parts.length > 0) && (
                <div className="service-rec-miles">
                  {Number(t.laborCost) > 0 && `$${Number(t.laborCost).toFixed(2)} labor`}
                  {Number(t.laborCost) > 0 && t.parts.length > 0 && " · "}
                  {t.parts.length > 0 &&
                    `${t.parts.length} part${t.parts.length !== 1 ? "s" : ""}`}
                </div>
              )}
              <button
                type="button"
                className="btn-small btn-success service-rec-btn"
                onClick={() => onApplyTemplate(t)}
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

export default QuickJobs;
