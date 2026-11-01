// Presentational only: same rule the pages already use (message contains "Error" => error style).
function StatusMessage({ message }) {
  if (!message) return null;
  const isError = message.includes('Error');
  return (
    <p className={`status-msg${isError ? ' status-msg--error' : ''}`} role="status">
      {message}
    </p>
  );
}

export default StatusMessage;
