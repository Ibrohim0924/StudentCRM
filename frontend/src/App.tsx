import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import InstructorsPage from './pages/InstructorsPage';
import StudentsPage from './pages/StudentsPage';
import EnrollmentsPage from './pages/EnrollmentsPage';

const App = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/instructors" element={<InstructorsPage />} />
      <Route path="/students" element={<StudentsPage />} />
      <Route path="/enrollments" element={<EnrollmentsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Layout>
);

export default App;