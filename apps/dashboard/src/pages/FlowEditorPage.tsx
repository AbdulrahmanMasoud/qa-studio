import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { flowsApi } from '../lib/api';
import { TestStep, ActionType, createEmptyStep } from '@qa-studio/shared';
import SortableStep from '../components/SortableStep';
import ActionPalette from '../components/ActionPalette';
import StepEditor from '../components/StepEditor';

export default function FlowEditorPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const queryClient = useQueryClient();

  const [steps, setSteps] = useState<TestStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: flow, isLoading } = useQuery({
    queryKey: ['flow', flowId],
    queryFn: () => flowsApi.get(flowId!),
    enabled: !!flowId,
  });

  useEffect(() => {
    if (flow) {
      setSteps((flow.steps as TestStep[]) || []);
    }
  }, [flow]);

  const saveMutation = useMutation({
    mutationFn: (stepsToSave: TestStep[]) =>
      flowsApi.update(flowId!, { steps: stepsToSave }),
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['flow', flowId] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  const handleAddStep = (actionType: ActionType) => {
    const newStep = createEmptyStep(actionType);
    setSteps([...steps, newStep]);
    setSelectedStepId(newStep.id);
    setHasChanges(true);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<TestStep>) => {
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)) as TestStep[]);
    setHasChanges(true);
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId));
    if (selectedStepId === stepId) setSelectedStepId(null);
    setHasChanges(true);
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);
  const activeStep = steps.find((s) => s.id === activeId);

  // Exclude use-flow from the palette when editing flows (prevent recursion)
  const excludeActions: ActionType[] = ['use-flow'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/projects/${flow?.projectId}/flows`}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{flow?.name}</h1>
              <p className="text-sm text-gray-500">
                {steps.length} step{steps.length !== 1 ? 's' : ''}
                {hasChanges && ' • Unsaved changes'}
              </p>
            </div>
          </div>
          <button
            onClick={() => saveMutation.mutate(steps)}
            disabled={!hasChanges || saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ActionPalette onAddStep={handleAddStep} excludeActions={excludeActions} />

        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {steps.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Add actions to build your reusable flow</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 max-w-2xl mx-auto">
                  {steps.map((step, index) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      index={index}
                      isSelected={selectedStepId === step.id}
                      onSelect={() => setSelectedStepId(step.id)}
                      onDelete={() => handleDeleteStep(step.id)}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeStep ? (
                  <div className="bg-white rounded-lg border-2 border-indigo-500 shadow-lg p-4 opacity-90">
                    <span className="font-medium">{activeStep.action}</span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {selectedStep && (
          <StepEditor
            step={selectedStep}
            onUpdate={(updates) => handleUpdateStep(selectedStep.id, updates)}
            onClose={() => setSelectedStepId(null)}
          />
        )}
      </div>
    </div>
  );
}
