import { useState, useEffect, useRef } from 'react';
import { getJobTemplates } from '../storage';
import JobCard from './JobCard';
import type { JobTemplate, WorkingJob } from '../types/index';

type JobSummary = { id: number; subtotal: number };
type Totals = { jobSummaries: JobSummary[] };
type Job = WorkingJob;

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="5" />
    <line x1="10.5" y1="10.5" x2="14" y2="14" />
  </svg>
);

function TemplateSearch({ onApply }: {
  onApply: (t: JobTemplate) => void;
}) {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getJobTemplates().then(setTemplates);
  }, []);

  const filtered = search.trim()
    ? templates.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.opCode || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      })
    : templates;

  const apply = (t: JobTemplate) => {
    onApply(t);
    setSearch('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      apply(filtered[0]);
    }
  };

  return (
    <div className="template-search-panel">
      <div className="template-search-bar">
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search templates or op code — Enter to add first match…"
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="template-search-list">
        {templates.length === 0 ? (
          <div className="template-search-empty">No templates saved yet.</div>
        ) : filtered.length === 0 ? (
          <div className="template-search-empty">No templates match.</div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              className="template-search-item"
              onClick={() => apply(t)}
            >
              <div className="template-search-info">
                <div className="template-search-name-row">
                  <strong>{t.name}</strong>
                  {t.opCode && (
                    <span className="template-search-opcode">{t.opCode}</span>
                  )}
                </div>
                <span className="template-search-meta">
                  {t.laborHrs > 0 && `${t.laborHrs} hrs · `}
                  {t.parts.length} part{t.parts.length !== 1 ? 's' : ''}
                  {(Number(t.laborCost) || 0) > 0 && ` · $${(Number(t.laborCost)).toFixed(2)}`}
                </span>
                {t.description && (
                  <span className="template-search-desc">{t.description}</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function JobsSection({ jobs, totals, onAddJob, onUpdateJob, onRemoveJob, onSaveAsTemplate, onApplyTemplate }: {
  jobs: Job[];
  totals: Totals;
  onAddJob: () => void;
  onUpdateJob: (id: number, field: string, value: unknown) => void;
  onRemoveJob: (id: number) => void;
  onSaveAsTemplate: (job: Job) => void;
  onApplyTemplate: (t: JobTemplate) => void;
}) {
  const getSubtotal = (jobId: number) => {
    const summary = totals.jobSummaries.find((s) => s.id === jobId);
    return summary ? summary.subtotal : 0;
  };

  return (
    <div className="jobs-section">
      <div className="jobs-header">
        <h3 className="section-heading">Jobs</h3>
        <button type="button" className="btn-small btn-secondary" onClick={onAddJob}>+ Blank Job</button>
      </div>
      <TemplateSearch onApply={onApplyTemplate} />
      <div id="jobs-container">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            subtotal={getSubtotal(job.id)}
            onUpdate={onUpdateJob}
            onRemove={onRemoveJob}
            onSaveAsTemplate={onSaveAsTemplate}
            isBlank={job.parts.length === 0 && !job.laborCost && !job.laborHrs && !job.description}
          />
        ))}
      </div>
    </div>
  );
}

export default JobsSection;
