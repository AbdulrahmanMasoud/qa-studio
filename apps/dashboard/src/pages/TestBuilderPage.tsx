import { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  ArrowLeft,
  Play,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  History,
  Video,
  StopCircle,
} from 'lucide-react';
import { testsApi, recorderApi } from '../lib/api';
import {
  TestStep,
  StepResult,
  ActionType,
  createEmptyStep,
} from '@qa-studio/shared';
import clsx from 'clsx';
import SortableStep, { StepRunStatus } from '../components/SortableStep';
import ActionPalette from '../components/ActionPalette';
import StepEditor from '../components/StepEditor';
import RunHistoryPanel from '../components/RunHistoryPanel';
import RunDetailPanel from '../components/RunDetailPanel';
import RecorderBar from '../components/RecorderBar';

export default function TestBuilderPage() {
  const { testId } = useParams<{ testId: string }>();
  const queryClient = useQueryClient();

  const [steps, setSteps] = useState<TestStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [useRealChrome, setUseRealChrome] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [lastRunResult, setLastRunResult] = useState<{
    status: string;
    durationMs?: number;
    error?: string;
  } | null>(null);

  // Live run progress state
  const [liveStepResults, setLiveStepResults] = useState<Map<string, StepResult>>(new Map());
  const [runningStepIndex, setRunningStepIndex] = useState<number>(-1);

  // Recorder state
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecorderStarting, setIsRecorderStarting] = useState(false);
  const [recorderSessionId, setRecorderSessionId] = useState<string | null>(null);
  const [recordedStepCount, setRecordedStepCount] = useState(0);
  const [recorderUrl, setRecorderUrl] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: test, isLoading } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => testsApi.get(testId!),
    enabled: !!testId,
  });

  useEffect(() => {
    if (test) {
      setSteps(test.steps || []);
      setUseRealChrome(test.config?.useRealChrome ?? false);
      if (test.projectId) {
        // We don't have baseUrl from project here, so leave recorderUrl as-is if already set
      }
    }
  }, [test]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: (stepsToSave: TestStep[]) =>
      testsApi.update(testId!, {
        steps: stepsToSave,
        config: { ...test?.config, useRealChrome },
      }),
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
    },
  });

  const runMutation = useMutation({
    mutationFn: () =>
      testsApi.runWithProgress(testId!, (stepResult, stepIndex) => {
        // A step just finished — update live results
        setLiveStepResults((prev) => {
          const next = new Map(prev);
          next.set(stepResult.stepId, stepResult);
          return next;
        });
        // The *next* step is now running (if this one passed)
        if (stepResult.status === 'passed') {
          setRunningStepIndex(stepIndex + 1);
        } else {
          // Failed or skipped — no more running step
          setRunningStepIndex(-1);
        }
      }),
    onMutate: () => {
      setIsRunning(true);
      setLastRunResult(null);
      setLiveStepResults(new Map());
      setRunningStepIndex(0);
      setSelectedStepId(null);
      setSelectedRunId(null);
      setShowRunHistory(false);
    },
    onSuccess: (result) => {
      setLastRunResult({
        status: result.status,
        durationMs: result.durationMs,
        error: result.error,
      });
      setSelectedRunId(result.id);
      setSelectedStepId(null);
      setShowRunHistory(false);
      queryClient.invalidateQueries({ queryKey: ['runs', testId] });
    },
    onSettled: () => {
      setIsRunning(false);
      setRunningStepIndex(-1);
    },
  });

  // --- Recorder handlers ---
  const handleStartRecording = useCallback(async () => {
    if (!testId || !recorderUrl) return;
    setIsRecorderStarting(true);
    try {
      const { sessionId } = await recorderApi.start(testId, recorderUrl);
      setRecorderSessionId(sessionId);
      setIsRecording(true);
      setRecordedStepCount(0);

      // Skip the initial goto step that will come from the navigation
      let isFirstGoto = true;

      // Open WebSocket to receive steps
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${protocol}://${window.location.host}/api/recorder/ws?sessionId=${sessionId}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'step') {
            // Skip the first goto (initial navigation we triggered)
            if (isFirstGoto && data.step.action === 'goto') {
              isFirstGoto = false;
              return;
            }
            isFirstGoto = false;
            setSteps((prev) => [...prev, data.step]);
            setRecordedStepCount((prev) => prev + 1);
            setHasChanges(true);
          } else if (data.type === 'disconnect') {
            // Browser was closed by user
            setIsRecording(false);
            setIsRecorderOpen(false);
            setRecorderSessionId(null);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
    } finally {
      setIsRecorderStarting(false);
    }
  }, [testId, recorderUrl]);

  const handleStopRecording = useCallback(async () => {
    if (recorderSessionId) {
      try {
        await recorderApi.stop(recorderSessionId);
      } catch {
        // session may already be closed
      }
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRecording(false);
    setIsRecorderOpen(false);
    setRecorderSessionId(null);
  }, [recorderSessionId]);

  const handleToggleRecorder = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      setIsRecorderOpen((prev) => !prev);
    }
  };

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
    setShowRunHistory(false);
    setSelectedRunId(null);
    setHasChanges(true);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<TestStep>) => {
    setSteps(
      steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      ) as TestStep[]
    );
    setHasChanges(true);
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter((step) => step.id !== stepId));
    if (selectedStepId === stepId) {
      setSelectedStepId(null);
    }
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(steps);
  };

  const handleRun = () => {
    if (hasChanges) {
      saveMutation.mutate(steps, {
        onSuccess: () => {
          runMutation.mutate();
        },
      });
    } else {
      runMutation.mutate();
    }
  };

  const handleToggleRealChrome = () => {
    setUseRealChrome((prev) => !prev);
    setHasChanges(true);
  };

  const handleToggleRunHistory = () => {
    if (showRunHistory) {
      setShowRunHistory(false);
    } else {
      setShowRunHistory(true);
      setSelectedRunId(null);
      setSelectedStepId(null);
    }
  };

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setShowRunHistory(false);
    setSelectedStepId(null);
  };

  const handleSelectStep = (stepId: string) => {
    setSelectedStepId(stepId);
    setShowRunHistory(false);
    setSelectedRunId(null);
  };

  const handleCloseRunPanels = () => {
    setShowRunHistory(false);
    setSelectedRunId(null);
  };

  const getStepRunStatus = (step: TestStep, index: number): StepRunStatus => {
    if (!isRunning) return null;
    const result = liveStepResults.get(step.id);
    if (result) return result.status as StepRunStatus;
    if (index === runningStepIndex) return 'running';
    return null;
  };

  const getStepDuration = (stepId: string): number | undefined => {
    return liveStepResults.get(stepId)?.durationMs;
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);
  const activeStep = steps.find((s) => s.id === activeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Determine which right panel to show
  const showStepEditor = selectedStep && !showRunHistory && !selectedRunId;
  const showRunDetail = !!selectedRunId && !showRunHistory;
  const showRunHistoryPanel = showRunHistory;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/projects/${test?.projectId}/tests`}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{test?.name}</h1>
              <p className="text-sm text-gray-500">
                {steps.length} step{steps.length !== 1 ? 's' : ''}
                {hasChanges && ' • Unsaved changes'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRunResult && (
              <div
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                  lastRunResult.status === 'passed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                )}
              >
                {lastRunResult.status === 'passed' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {lastRunResult.status === 'passed' ? 'Passed' : 'Failed'}
                {lastRunResult.durationMs && (
                  <span className="text-xs opacity-75">
                    ({(lastRunResult.durationMs / 1000).toFixed(2)}s)
                  </span>
                )}
              </div>
            )}
            <label
              className="flex items-center gap-2 cursor-pointer select-none"
              title={useRealChrome ? 'Using real Chrome (bypasses bot detection)' : 'Using default Playwright browser'}
            >
              <span className="text-sm text-gray-600">Real Browser</span>
              <button
                role="switch"
                aria-checked={useRealChrome}
                onClick={handleToggleRealChrome}
                className={clsx(
                  'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                  useRealChrome ? 'bg-indigo-600' : 'bg-gray-300'
                )}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5',
                    useRealChrome ? 'translate-x-4 ml-0.5' : 'translate-x-0 ml-0.5'
                  )}
                />
              </button>
            </label>
            <button
              onClick={handleToggleRecorder}
              disabled={isRunning}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isRecording
                  ? 'bg-red-600 text-white shadow-sm hover:bg-red-700'
                  : isRecorderOpen
                    ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                    : 'text-red-600 bg-red-50 hover:bg-red-100 ring-1 ring-red-200/60'
              )}
            >
              {isRecording ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <StopCircle className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Record
                </>
              )}
            </button>
            <button
              onClick={handleToggleRunHistory}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                showRunHistory || selectedRunId
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              )}
            >
              <History className="h-4 w-4" />
              Runs
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning || steps.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? 'Running...' : 'Run Test'}
            </button>
          </div>
        </div>
      </header>

      {/* Recorder bar */}
      {(isRecorderOpen || isRecording) && (
        <RecorderBar
          isRecording={isRecording}
          isStarting={isRecorderStarting}
          recordedStepCount={recordedStepCount}
          startUrl={recorderUrl}
          onStartUrlChange={setRecorderUrl}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          onClose={() => setIsRecorderOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Action palette */}
        <ActionPalette onAddStep={handleAddStep} />

        {/* Steps list */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {steps.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">
                Drag actions from the left panel to build your test
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-w-2xl mx-auto">
                  {steps.map((step, index) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      index={index}
                      isSelected={selectedStepId === step.id}
                      onSelect={() => handleSelectStep(step.id)}
                      onDelete={() => handleDeleteStep(step.id)}
                      runStatus={getStepRunStatus(step, index)}
                      durationMs={getStepDuration(step.id)}
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

        {/* Right panel: Step editor / Run detail / Run history */}
        {showStepEditor && (
          <StepEditor
            step={selectedStep}
            onUpdate={(updates) => handleUpdateStep(selectedStep.id, updates)}
            onClose={() => setSelectedStepId(null)}
          />
        )}
        {showRunDetail && (
          <RunDetailPanel
            runId={selectedRunId!}
            onBack={() => {
              setSelectedRunId(null);
              setShowRunHistory(true);
            }}
            onClose={handleCloseRunPanels}
          />
        )}
        {showRunHistoryPanel && testId && (
          <RunHistoryPanel
            testId={testId}
            onSelectRun={handleSelectRun}
            onClose={handleCloseRunPanels}
          />
        )}
      </div>
    </div>
  );
}
