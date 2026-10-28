import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Remedies from './pages/Remedies';
import SoilHealth from './pages/SoilHealth';
import Market from './pages/Market';
import Ledger from './pages/Ledger';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="remedies" element={<Remedies />} />
        <Route path="soil" element={<SoilHealth />} />
        <Route path="market" element={<Market />} />
        <Route path="ledger" element={<Ledger />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
