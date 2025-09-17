import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import HomePage from '@/pages/HomePage';
import UploadPage from '@/pages/UploadPage';
import IndicatorsPage from '@/pages/IndicatorsPage';
import AttendancePage from '@/pages/AttendancePage';
import DatabasePage from '@/pages/DatabasePage';
import AdminPage from '@/pages/AdminPage';
import FilesPage from '@/pages/FilesPage';
import './styles/globals.css';

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;