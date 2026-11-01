import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import StatusMessage from '../components/StatusMessage';
import TableWrap from '../components/TableWrap';

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Form state for creating a new client
  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    billing_address: '',
    default_hourly_rate: '',
    currency: 'USD'
  });

  // Load clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/clients`);
      const data = await res.json();
      setClients(data);
    } catch (err) {
      setStatusMessage(`Error loading clients: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClient(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage('');

    try {
      const res = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClient.name,
          email: newClient.email || null,
          phone: newClient.phone || null,
          billing_address: newClient.billing_address,
          default_hourly_rate: parseFloat(newClient.default_hourly_rate) || null,
          currency: newClient.currency || 'USD'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create client');
      }

      setStatusMessage('Client created successfully!');
      setNewClient({
        name: '',
        email: '',
        phone: '',
        billing_address: '',
        default_hourly_rate: '',
        currency: 'USD'
      });
      setShowForm(false);
      await fetchClients();
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Clients</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add New Client'}
        </button>
      </div>

      <StatusMessage message={statusMessage} />

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-grid">
          <div>
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={newClient.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={newClient.email}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label>Phone</label>
            <input
              type="text"
              name="phone"
              value={newClient.phone}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label>Billing Address *</label>
            <input
              type="text"
              name="billing_address"
              value={newClient.billing_address}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label>Default Hourly Rate ($)</label>
            <input
              type="number"
              name="default_hourly_rate"
              value={newClient.default_hourly_rate}
              onChange={handleInputChange}
              step="0.01"
            />
          </div>
          <div>
            <label>Currency</label>
            <select
              name="currency"
              value={newClient.currency}
              onChange={handleInputChange}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Client'}
          </button>
        </form>
      )}

      {isLoading && !showForm ? (
        <p className="muted">Loading clients...</p>
      ) : (
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Billing Address</th>
                <th>Hourly Rate</th>
                <th>Currency</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty">
                    No clients yet. Click "Add New Client" to create one.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.email || '-'}</td>
                    <td>{client.phone || '-'}</td>
                    <td>{client.billing_address}</td>
                    <td>{client.default_hourly_rate ? `$${client.default_hourly_rate}` : '-'}</td>
                    <td>{client.currency}</td>
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

export default ClientsPage;
