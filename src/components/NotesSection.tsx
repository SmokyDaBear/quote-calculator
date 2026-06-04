function NotesSection({ notes, onChange }: { notes: string; onChange: (v: string) => void }) {
  return (
    <div className="notes-section">
      <h3 className="section-heading">Order Notes</h3>
      <textarea
        className="notes-textarea"
        placeholder="Add order notes..."
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}

export default NotesSection;
