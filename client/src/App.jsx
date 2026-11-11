import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Leads from './pages/Leads';
import NovoLead from './pages/NovoLead';
import LeadDetail from './pages/LeadDetail';
import Empreendimentos from './pages/Empreendimentos';
import EmpreendimentoDetail from './pages/EmpreendimentoDetail';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="kanban" element={<Kanban />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/novo" element={<NovoLead />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="empreendimentos" element={<Empreendimentos />} />
        <Route path="empreendimentos/:id" element={<EmpreendimentoDetail />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
