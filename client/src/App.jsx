import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import TimerPage from './pages/TimerPage';
import ClientsPage from './pages/ClientsPage';
import ProjectsPage from './pages/ProjectsPage';
import ReportsPage from './pages/ReportsPage';
import InvoicesPage from './pages/InvoicesPage';

function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Time Tracker</span>
          <nav className="nav">
            <NavLink to="/" end>Timer</NavLink>
            <NavLink to="/clients">Clients</NavLink>
            <NavLink to="/projects">Projects</NavLink>
            <NavLink to="/reports">Reports</NavLink>
            <NavLink to="/invoices">Invoices</NavLink>
          </nav>
        </div>
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<TimerPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
