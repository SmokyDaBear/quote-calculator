import { useState, useEffect } from 'react';
import { getJobTemplates } from '../storage';
import JobCard from './JobCard';

function TemplateSearch({ onApply, onAddBlank, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTemplates(getJobTemplates());
  }, []);

  const filtered = search.trim()
    ? templates.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      })
    : templates;

  return (
    <div className="template-search-panel">
      <div className="template-search-bar">
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <button className="btn-small" onClick={onAddBlank}>+ Add Blank</button>
        <button className="btn-remove" onClick={onClose} title="Close">×</button>
      </div>
      <div className="template-search-list">
        {templates.length === 0 ? (
          <div className="template-search-empty">No templates saved yet.</div>
        ) : filtered.length === 0 ? (
          <div className="template-search-empty">No templates match.</div>
        ) : (
          filtered.map((t) => {
            const partsTotal = t.parts.reduce(
              (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
              0
            );
            const jobTotal = partsTotal + (Number(t.laborCost) || 0);
            return (
              <div key={t.id} className="template-search-item">
                <div className="template-search-info">
                  <strong>{t.name}</strong>
                  <span className="template-search-meta">
                    {t.laborHrs > 0 && `${t.laborHrs} hrs · `}
                    {t.parts.length} part{t.parts.length !== 1 ? 's' : ''}
                    {jobTotal > 0 && ` · $${jobTotal.toFixed(2)}`}
                  </span>
                  {t.description && (
                    <span className="template-search-desc">{t.description}</span>
                  )}
                </div>
                <button className="btn-small btn-success" onClick={() => onApply(t)}>
                  Add
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function JobsSection({ jobs, totals, onAddJob, onUpdateJob, onRemoveJob, onSaveAsTemplate, onApplyTemplate }) {
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const getSubtotal = (jobId) => {
    const summary = totals.jobSummaries.find((s) => s.id === jobId);
    return summary ? summary.subtotal : 0;
  };

  const handleApply = (template) => {
    onApplyTemplate(template);
    setShowTemplatePicker(false);
  };

  const handleAddBlank = () => {
    onAddJob();
    setShowTemplatePicker(false);
  };

  return (
    <div className="jobs-section">
      <div className="jobs-header">
        <h3>Jobs</h3>
        <button type="button" className="btn-small" onClick={() => setShowTemplatePicker(true)}>
          + Add Job
        </button>
      </div>
      {showTemplatePicker && (
        <TemplateSearch
          onApply={handleApply}
          onAddBlank={handleAddBlank}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
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
