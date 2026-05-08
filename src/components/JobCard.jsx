function JobCard({ job, subtotal, onUpdate, onRemove, onSaveAsTemplate, onOpenPartPicker }) {
  const addPart = () => {
    onUpdate(job.id, 'parts', [
      ...job.parts,
      { partNumber: '', name: '', price: '', quantity: 1 },
    ]);
  };

  const updatePart = (idx, field, value) => {
    onUpdate(
      job.id,
      'parts',
      job.parts.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  };

  const removePart = (idx) => {
    onUpdate(job.id, 'parts', job.parts.filter((_, i) => i !== idx));
  };

  const partsTotal = job.parts.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
    0
  );

  return (
    <div className="job-card" data-job-id={job.id}>
      <div className="job-header">
        <input
          type="text"
          className="job-name"
          value={job.name}
          onChange={(e) => onUpdate(job.id, 'name', e.target.value)}
        />
        <button type="button" className="btn-remove" onClick={() => onRemove(job.id)}>
          ×
        </button>
      </div>

      <div className="job-inputs">
        <div className="form-group">
          <label>Labor Hrs</label>
          <input
            type="number"
            step="0.1"
            placeholder="0"
            value={job.laborHrs}
            onChange={(e) => onUpdate(job.id, 'laborHrs', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Labor Cost ($)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={job.laborCost}
            onChange={(e) => onUpdate(job.id, 'laborCost', e.target.value)}
          />
        </div>
      </div>

      <div className="parts-section">
        <div className="parts-section-header">
          <span className="parts-section-label">Parts</span>
          <div className="parts-header-actions">
            <button type="button" className="btn-small btn-secondary" onClick={() => onOpenPartPicker(job.id)}>
              From Library
            </button>
            <button type="button" className="btn-small" onClick={addPart}>
              + Add Part
            </button>
          </div>
        </div>
        {job.parts.length > 0 && (
          <>
            <div className="parts-col-headers">
              <span>Part #</span>
              <span>Name</span>
              <span>Price ($)</span>
              <span>Qty</span>
              <span>Extended</span>
              <span />
            </div>
            {job.parts.map((part, idx) => {
              const extended = (Number(part.price) || 0) * (Number(part.quantity) || 0);
              return (
                <div key={idx} className="part-row">
                  <input
                    type="text"
                    placeholder="Part #"
                    value={part.partNumber}
                    onChange={(e) => updatePart(idx, 'partNumber', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={part.name}
                    onChange={(e) => updatePart(idx, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={part.price}
                    onChange={(e) => updatePart(idx, 'price', e.target.value)}
                  />
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="1"
                    value={part.quantity}
                    onChange={(e) => updatePart(idx, 'quantity', e.target.value)}
                  />
                  <span className="part-extended">${extended.toFixed(2)}</span>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removePart(idx)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <div className="parts-total-row">
              Parts Total: ${partsTotal.toFixed(2)}
            </div>
          </>
        )}
      </div>

      <div className="form-group job-description-group">
        <label>Description</label>
        <textarea
          className="job-description"
          placeholder="Job description..."
          value={job.description}
          onChange={(e) => onUpdate(job.id, 'description', e.target.value)}
        />
      </div>

      <div className="job-footer">
        <button type="button" className="btn-small btn-secondary" onClick={() => onSaveAsTemplate(job)}>
          Save as Template
        </button>
        <div className="job-subtotal">
          <span>Subtotal: </span>
          <span className="job-subtotal-value">${subtotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default JobCard;
