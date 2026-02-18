import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, ExternalLink } from 'lucide-react';
import { projectsApi } from '../lib/api';
import type { Project } from '@qa-studio/shared';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setNewProjectName('');
      setNewProjectUrl('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createMutation.mutate({
      name: newProjectName.trim(),
      baseUrl: newProjectUrl.trim() || undefined,
    });
  };

  const handleDelete = (project: Project) => {
    if (confirm(`Delete project "${project.name}"? This will delete all tests.`)) {
      deleteMutation.mutate(project.id);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage your testing projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Project
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Project</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Magento Store"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base URL (optional)
                  </label>
                  <input
                    type="url"
                    value={newProjectUrl}
                    onChange={(e) => setNewProjectUrl(e.target.value)}
                    placeholder="https://mystore.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim() || createMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading projects...</div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="text-gray-500 mt-1">Create your first project to start testing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link
                    to={`/projects/${project.id}/tests`}
                    className="text-lg font-semibold text-gray-900 hover:text-indigo-600"
                  >
                    {project.name}
                  </Link>
                  {project.baseUrl && (
                    <a
                      href={project.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {project.baseUrl}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(project)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  to={`/projects/${project.id}/tests`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View Tests →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
