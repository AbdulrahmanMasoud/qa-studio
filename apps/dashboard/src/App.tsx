import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectsPage from './pages/ProjectsPage';
import TestsPage from './pages/TestsPage';
import TestBuilderPage from './pages/TestBuilderPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import FlowsPage from './pages/FlowsPage';
import FlowEditorPage from './pages/FlowEditorPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId/tests" element={<TestsPage />} />
        <Route path="projects/:projectId/dashboard" element={<ProjectDashboardPage />} />
        <Route path="projects/:projectId/flows" element={<FlowsPage />} />
        <Route path="flows/:flowId" element={<FlowEditorPage />} />
        <Route path="tests/:testId" element={<TestBuilderPage />} />
      </Route>
    </Routes>
  );
}

export default App;
