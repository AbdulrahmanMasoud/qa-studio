import { Outlet, Link, useLocation } from 'react-router-dom';
import { FlaskConical, FolderKanban } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-indigo-400" />
            <span className="text-xl font-bold">QA Studio</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <Link
                to="/projects"
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  location.pathname.startsWith('/projects')
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                )}
              >
                <FolderKanban className="h-5 w-5" />
                Projects
              </Link>
            </li>
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-gray-500 text-sm">
          Powered by Playwright
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
