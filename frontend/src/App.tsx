import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { LoginForm } from '@/components/LoginForm';
import HomePage from '@/pages/HomePage';
import UploadPage from '@/pages/UploadPage';
import IndicatorsPage from '@/pages/IndicatorsPage';
import AttendancePage from '@/pages/AttendancePage';
import DatabasePage from '@/pages/DatabasePage';
import AdminPage from '@/pages/AdminPage';
import FilesPage from '@/pages/FilesPage';
import './styles/globals.css';

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/indicators" element={<IndicatorsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/database" element={<DatabasePage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;