// Presentational only: renders a status (task, invoice, or project) as a pill.
function StatusBadge({ status }) {
  return (
    <span className={`badge badge--${status}`}>
      {String(status).replace('_', ' ')}
    </span>
  );
}

export default StatusBadge;