import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import StatusMessage from '../components/StatusMessage';
import StatusBadge from '../components/StatusBadge';
import TableWrap from '../components/TableWrap';
import ToastStack from '../components/ToastStack';
import useToast from '../hooks/useToast';

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const sendInvoice = async (invoiceId) => {
    try {
      const response = await fetch(`${API_URL}/api/invoices/${invoiceId}/send`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invoice');
      }
      
      const result = await response.json();
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      const detail = invoice
        ? `${invoice.invoice_number} went to ${invoice.client_name}.`
        : result.message;
      showToast({ type: 'success', title: 'Invoice sent', message: detail });
      fetchInvoices();
    } catch (error) {
      showToast({ type: 'error', title: "Couldn't send invoice", message: error.message });
    }
  };

  const downloadPDF = async (invoiceId) => {
    try {
      const response = await fetch(`${API_URL}/api/invoices/${invoiceId}/download`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast({ type: 'error', title: "Couldn't download PDF", message: error.message });
    }
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/invoices`);
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      setStatusMessage('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/api/projects`);
        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const previewInvoice = async () => {
    if (!selectedProjectId || !startDate || !endDate) {
      setStatusMessage('Please fill in all fields');
      return;
    }

    setIsPreviewing(true);
    setStatusMessage('');
    try {
      const response = await fetch(`${API_URL}/api/invoices/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: parseInt(selectedProjectId),
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Preview failed');
      setPreview(data);
    } catch (error) {
      setStatusMessage('Error: ' + error.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const generateInvoice = async () => {
    if (!selectedProjectId || !startDate || !endDate) {
      setStatusMessage('Please fill in all fields');
      return;
    }

    setIsGenerating(true);
    setStatusMessage('');
    try {
      const response = await fetch(`${API_URL}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: parseInt(selectedProjectId),
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      setStatusMessage('Invoice generated successfully');
      setPreview(null);
      setSelectedProjectId('');
      setStartDate('');
      setEndDate('');
      fetchInvoices();
    } catch (error) {
      setStatusMessage('Error: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Invoices</h1>
      </div>

      <StatusMessage message={statusMessage} />

      <div className="card">
        <h3>Generate New Invoice</h3>
        <div className="filters">
          <div>
            <label>Project </label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label>Start Date </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label>End Date </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={previewInvoice} disabled={isPreviewing || isGenerating}>
            {isPreviewing ? 'Previewing...' : 'Preview'}
          </button>
          <button className="btn-primary" onClick={generateInvoice} disabled={isPreviewing || isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="card">
          <h3>Preview - {preview.project_name}</h3>
          <p>Entries: {preview.entry_count} | Total Hours: {preview.total_hours}h | Subtotal: {preview.subtotal}</p>
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Task</th>
                  <th>Category</th>
                  <th className="num">Hours</th>
                </tr>
              </thead>
              <tbody>
                {preview.entries.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty">
                      No entries found for this project and date range.
                    </td>
                  </tr>
                )}
                {preview.entries.map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.custom_name || e.category_name}</td>
                    <td>{e.category_name}</td>
                    <td className="num">{(e.duration_minutes / 60).toFixed(2)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}

      <h3>All Invoices</h3>
      {isLoading ? (
        <p className="muted">Loading...</p>
      ) : invoices.length === 0 ? (
        <p className="muted">No invoices yet.</p>
      ) : (
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Client</th>
                <th>Status</th>
                <th className="num">Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number}</td>
                  <td>{invoice.client_name}</td>
                  <td><StatusBadge status={invoice.status} /></td>
                  <td className="num">{invoice.currency} {invoice.subtotal?.toFixed(2)}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => downloadPDF(invoice.id)}>
                        Download PDF
                      </button>
                      <button onClick={() => sendInvoice(invoice.id)}>
                        Send
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default InvoicesPage;
