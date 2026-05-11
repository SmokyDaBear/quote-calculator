function Modal({ isOpen, onCancel, onConfirm }: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className={`modal-overlay${isOpen ? ' show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal">
        <h3>Clear History?</h3>
        <p>This will permanently delete all saved quotes. This action cannot be undone.</p>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>Clear All</button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
