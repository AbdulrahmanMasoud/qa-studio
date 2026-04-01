import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ProjectsPage from './pages/ProjectsPage';
import TestsPage from './pages/TestsPage';
import TestBuilderPage from './pages/TestBuilderPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import FlowsPage from './pages/FlowsPage';
import FlowEditorPage from './pages/FlowEditorPage';

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-300 mb-2">404</h2>
        <p className="text-gray-500 mb-4">Page not found</p>
        <Link to="/projects" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Go to Projects
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId/tests" element={<TestsPage />} />
          <Route path="projects/:projectId/dashboard" element={<ProjectDashboardPage />} />
          <Route path="projects/:projectId/flows" element={<FlowsPage />} />
          <Route path="flows/:flowId" element={<FlowEditorPage />} />
          <Route path="tests/:testId" element={<TestBuilderPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
