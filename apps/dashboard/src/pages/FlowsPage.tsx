import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, Loader2, Workflow } from 'lucide-react';
import { projectsApi, flowsApi } from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export default function FlowsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: flows, isLoading } = useQuery({
    queryKey: ['flows', projectId],
    queryFn: () => flowsApi.listByProject(projectId!),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: flowsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows', projectId] });
      setShowCreate(false);
      setNewFlowName('');
      toast.success('Flow created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create flow'),
  });

  const deleteMutation = useMutation({
    mutationFn: flowsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows', projectId] });
      setConfirmDelete(null);
      toast.success('Flow deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete flow'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowName.trim() || !projectId) return;
    createMutation.mutate({ projectId, name: newFlowName.trim() });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          to={`/projects/${projectId}/tests`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tests
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project?.name} — Flows</h1>
            <p className="text-gray-500 mt-1">
              {flows?.length || 0} flow{flows?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Flow
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Flow</h2>
            <form onSubmit={handleCreate}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flow Name</label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="Login Flow"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
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
                  disabled={!newFlowName.trim() || createMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Flow"
          message={`Delete "${confirmDelete.name}"? Tests using this flow will need to be updated.`}
          confirmLabel="Delete"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
        </div>
      ) : flows?.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Workflow className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No flows yet</h3>
          <p className="text-gray-500 mt-1 max-w-md mx-auto">
            Flows are reusable step sequences you can include in multiple tests. Create a login flow once, use it everywhere.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Flow
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {flows?.map((flow) => (
            <div
              key={flow.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Workflow className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <Link
                      to={`/flows/${flow.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {flow.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {(flow.steps as any[]).length} step{(flow.steps as any[]).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/flows/${flow.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setConfirmDelete({ id: flow.id, name: flow.name })}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
