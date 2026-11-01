import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import StatusMessage from '../components/StatusMessage';
import TableWrap from '../components/TableWrap';

function ReportsPage() {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalHours, setTotalHours] = useState(0);
  const [totalBillable, setTotalBillable] = useState(0);

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  const fetchReport = async () => {
    setIsLoading(true);
    setStatusMessage('');
    try {
      const url = `${API_URL}/api/reports/project-summary?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch report data');
      }
      const data = await res.json();
      setReportData(data);
      
      const hours = data.reduce((sum, row) => sum + row.total_hours, 0);
      const billable = data.reduce((sum, row) => sum + row.billable_amount, 0);
      setTotalHours(hours);
      setTotalBillable(billable);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    if (reportData.length === 0) {
      setStatusMessage('No data to export');
      return;
    }

    const headers = ['Project', 'Client', 'Total Hours', 'Billable Amount', 'Budget Hours', 'Utilization %'];
    const rows = reportData.map(row => [
      row.project_name,
      row.client_name,
      row.total_hours.toFixed(2),
      row.formatted_amount,
      row.budget_hours || '-',
      `${row.utilization_percentage}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `project-summary-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Presentation only: returns a CSS class (colors live in index.css so they follow light/dark mode)
  const getUtilizationClass = (percentage) => {
    if (percentage >= 90) return 'util-bar--over';
    if (percentage >= 75) return 'util-bar--high';
    if (percentage >= 50) return 'util-bar--mid';
    return 'util-bar--low';
  };

  return (
    <div>
      <div className="page-head">
        <h1>Project Summary Report</h1>
      </div>

      <div className="filters">
        <div>
          <label>Start Date: </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label>End Date: </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button onClick={fetchReport} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
        <button className="btn-primary" onClick={exportCSV} disabled={reportData.length === 0}>
          Export CSV
        </button>
      </div>

      <StatusMessage message={statusMessage} />

      <div className="stat-grid">
        <div className="card">
          <span className="stat-label">Total Hours</span>
          <p className="stat-value">{totalHours.toFixed(2)}h</p>
        </div>
        <div className="card">
          <span className="stat-label">Total Billable</span>
          <p className="stat-value">${totalBillable.toFixed(2)}</p>
        </div>
        <div className="card">
          <span className="stat-label">Active Projects</span>
          <p className="stat-value">{reportData.length}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="muted">Loading report data...</p>
      ) : reportData.length === 0 ? (
        <p className="muted">No time entries found for the selected date range.</p>
      ) : (
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th className="num">Total Hours</th>
                <th className="num">Billable Amount</th>
                <th className="num">Budget Hours</th>
                <th className="center">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row) => (
                <tr key={row.project_id}>
                  <td>{row.project_name}</td>
                  <td>{row.client_name}</td>
                  <td className="num">{row.total_hours.toFixed(2)}h</td>
                  <td className="num">{row.formatted_amount}</td>
                  <td className="num">{row.budget_hours || '-'}</td>
                  <td className="center">
                    {row.budget_hours ? (
                      <div className="util">
                        <div className="util-track">
                          <div
                            className={`util-bar ${getUtilizationClass(row.utilization_percentage)}`}
                            style={{ width: `${Math.min(row.utilization_percentage, 100)}%` }}
                          />
                        </div>
                        <span className="util-label">{row.utilization_percentage}%</span>
                      </div>
                    ) : (
                      <span className="muted">No budget set</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}

export default ReportsPage;