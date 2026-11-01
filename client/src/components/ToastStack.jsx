// Presentational only. `toasts` is [{ id, type: 'success' | 'error', title, message }].
function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <div className="toast-body">
            <p className="toast-title">{toast.title}</p>
            {toast.message && <p className="toast-message">{toast.message}</p>}
          </div>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastStack;
