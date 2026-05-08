function NotesSection({ notes, onChange }) {
  return (
    <div className="notes-section">
      <h3>Order Notes</h3>
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
