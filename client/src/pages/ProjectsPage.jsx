import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import StatusMessage from '../components/StatusMessage';
import StatusBadge from '../components/StatusBadge';
import TableWrap from '../components/TableWrap';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({
    client_id: '',
    name: '',
    hourly_rate: '',
    budget_hours: '',
    is_active: true
  });

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setStatusMessage(`Error loading projects: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/clients`);
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewProject(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage('');

    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: parseInt(newProject.client_id),
          name: newProject.name,
          hourly_rate: parseFloat(newProject.hourly_rate) || null,
          budget_hours: parseFloat(newProject.budget_hours) || null,
          is_active: newProject.is_active
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create project');
      }

      setStatusMessage('Project created successfully!');
      setNewProject({
        client_id: '',
        name: '',
        hourly_rate: '',
        budget_hours: '',
        is_active: true
      });
      setShowForm(false);
      await fetchProjects();
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Projects</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add New Project'}
        </button>
      </div>

      <StatusMessage message={statusMessage} />

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-grid">
          <div>
            <label>Client *</label>
            <select
              name="client_id"
              value={newProject.client_id}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Select a client --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Project Name *</label>
            <input
              type="text"
              name="name"
              value={newProject.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label>Hourly Rate ($)</label>
            <input
              type="number"
              name="hourly_rate"
              value={newProject.hourly_rate}
              onChange={handleInputChange}
              step="0.01"
            />
          </div>
          <div>
            <label>Budget Hours</label>
            <input
              type="number"
              name="budget_hours"
              value={newProject.budget_hours}
              onChange={handleInputChange}
              step="0.5"
            />
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={newProject.is_active}
                onChange={handleInputChange}
              />
              Active
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      {isLoading && !showForm ? (
        <p className="muted">Loading projects...</p>
      ) : (
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Client</th>
                <th>Hourly Rate</th>
                <th>Budget Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty">
                    No projects yet. Click "Add New Project" to create one.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{project.client_name || 'Unknown'}</td>
                    <td>{project.hourly_rate ? `$${project.hourly_rate}` : '-'}</td>
                    <td>{project.budget_hours || '-'}</td>
                    <td>
                      <StatusBadge status={project.is_active ? 'active' : 'inactive'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}

export default ProjectsPage;
