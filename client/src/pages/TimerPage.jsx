import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import StatusMessage from '../components/StatusMessage';
import StatusBadge from '../components/StatusBadge';
import TableWrap from '../components/TableWrap';

function TimerPage() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [runningTaskId, setRunningTaskId] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualSeconds, setManualSeconds] = useState('');
  const [selectedTaskForManual, setSelectedTaskForManual] = useState(null);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  // Load all clients and projects on mount
  useEffect(() => {
    fetch(`${API_URL}/api/clients`)
      .then((res) => res.json())
      .then(setClients)
      .catch((err) => setStatusMessage(`Error loading clients: ${err.message}`));

    fetch(`${API_URL}/api/projects`)
      .then((res) => res.json())
      .then(setProjects)
      .catch((err) => setStatusMessage(`Error loading projects: ${err.message}`));
  }, []);

  // Reset project/task selection whenever the client changes
  useEffect(() => {
    setSelectedProjectId('');
    setTasks([]);
  }, [selectedClientId]);

  // Load tasks whenever the selected project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    fetchTasks();
  }, [selectedProjectId]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tasks?project_id=${selectedProjectId}`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setStatusMessage(`Error loading tasks: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    await fetch(`${API_URL}/api/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  };

  const startTask = async (taskId) => {
    setStatusMessage('');
    startTimeRef.current = new Date();
    setRunningTaskId(taskId);
    setElapsedSeconds(0);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((new Date() - startTimeRef.current) / 1000));
    }, 1000);

    await updateTaskStatus(taskId, 'in_progress');
    fetchTasks();
  };

  const pauseTask = async (taskId) => {
    const endTime = new Date();
    const startTime = startTimeRef.current;

    try {
      clearInterval(intervalRef.current);

      const res = await fetch(`${API_URL}/api/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          date: startTime.toISOString().split('T')[0],
          billable: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save time entry');
      }

      await updateTaskStatus(taskId, 'paused');
      setStatusMessage('Time segment saved.');
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setRunningTaskId(null);
      setElapsedSeconds(0);
      startTimeRef.current = null;
      fetchTasks();
    }
  };

  const completeTask = async (taskId) => {
    if (runningTaskId === taskId) {
      await pauseTask(taskId);
    }
    await updateTaskStatus(taskId, 'completed');
    fetchTasks();
  };

  const handleManualTimeEntry = async () => {
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const seconds = parseInt(manualSeconds) || 0;
    const totalMinutes = hours * 60 + minutes + seconds / 60;

    if (totalMinutes === 0) {
      setStatusMessage('Please enter a valid time');
      return;
    }

    if (!selectedTaskForManual) {
      setStatusMessage('Please select a task first');
      return;
    }

    setIsLoading(true);
    setStatusMessage('');

    try {
      const now = new Date();
      const startTime = new Date(now);
      startTime.setMinutes(now.getMinutes() - totalMinutes);

      const response = await fetch(`${API_URL}/api/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: selectedTaskForManual,
          start_time: startTime.toISOString(),
          end_time: now.toISOString(),
          duration_minutes: totalMinutes,
          date: now.toISOString().split('T')[0],
          billable: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add time');
      }

      setStatusMessage(`Added ${totalMinutes.toFixed(1)} minutes successfully`);
      setManualHours('');
      setManualMinutes('');
      setManualSeconds('');
      setSelectedTaskForManual(null);
      setShowManualEntry(false);
      fetchTasks();
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Timer</h1>
      </div>

      <div className="project-picker">
        <label>
          Client:
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">-- Select a client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label>
          Project:
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={!selectedClientId}
          >
            <option value="">-- Select a project --</option>
            {projects
              .filter((p) => String(p.client_id) === String(selectedClientId))
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </label>
      </div>

      <StatusMessage message={statusMessage} />

      {selectedProjectId && (
        <>
          {isLoading ? (
            <p className="muted">Loading tasks...</p>
          ) : (
            <TableWrap>
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Total Time</th>
                    <th>Action</th>
                    <th>Manual</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty">
                        No tasks yet.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className={runningTaskId === task.id ? 'is-running' : ''}>
                        <td>{task.custom_name || task.category_name}</td>
                        <td><StatusBadge status={task.status} /></td>
                        <td className="time">
                          {task.total_minutes}m
                          {runningTaskId === task.id &&
                            ` (+${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s)`}
                        </td>
                        <td>
                          <div className="row-actions">
                            {runningTaskId === task.id ? (
                              <button className="btn-primary" onClick={() => pauseTask(task.id)}>Pause</button>
                            ) : (
                              <button
                                className="btn-primary"
                                onClick={() => startTask(task.id)}
                                disabled={runningTaskId !== null}
                              >
                                Start
                              </button>
                            )}
                            {task.status !== 'completed' && (
                              <button
                                onClick={() => completeTask(task.id)}
                                disabled={runningTaskId === task.id}
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setSelectedTaskForManual(task.id);
                              setShowManualEntry(!showManualEntry);
                            }}
                            disabled={task.status === 'completed'}
                          >
                            + Manual
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableWrap>
          )}

          {/* Manual Time Entry Form */}
          {showManualEntry && selectedTaskForManual && (
            <div className="card" style={{ marginTop: 24 }}>
              <h4>Add Manual Time</h4>
              <div className="filters" style={{ marginBottom: 0 }}>
                <div>
                  <label>Hours: </label>
                  <input
                    type="number"
                    min="0"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    className="time-input"
                  />
                </div>
                <div>
                  <label>Minutes: </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    className="time-input"
                  />
                </div>
                <div>
                  <label>Seconds: </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualSeconds}
                    onChange={(e) => setManualSeconds(e.target.value)}
                    className="time-input"
                  />
                </div>
                <button className="btn-primary" onClick={handleManualTimeEntry} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Add Time'}
                </button>
                <button onClick={() => {
                  setShowManualEntry(false);
                  setSelectedTaskForManual(null);
                  setManualHours('');
                  setManualMinutes('');
                  setManualSeconds('');
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TimerPage;
