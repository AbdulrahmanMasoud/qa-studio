import { FastifyInstance } from 'fastify';
import { startRecording, stopRecording, getSession } from '../services/recorder.js';

export async function recorderRoutes(app: FastifyInstance) {
  // Start recording session
  app.post('/api/recorder/start', async (request, reply) => {
    const { testId, startUrl, recordDelays, device } = request.body as { testId: string; startUrl: string; recordDelays?: boolean; device?: string | null };

    if (!testId || !startUrl) {
      return reply.status(400).send({ error: 'testId and startUrl are required' });
    }

    try {
      const sessionId = await startRecording(testId, startUrl, { recordDelays: recordDelays ?? false, device: device ?? null });
      return { sessionId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start recording';
      return reply.status(500).send({ error: message });
    }
  });

  // Stop recording session
  app.post('/api/recorder/stop', async (request, reply) => {
    const { sessionId } = request.body as { sessionId: string };

    if (!sessionId) {
      return reply.status(400).send({ error: 'sessionId is required' });
    }

    try {
      await stopRecording(sessionId);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop recording';
      return reply.status(500).send({ error: message });
    }
  });

  // WebSocket endpoint for streaming recorded steps
  app.get('/api/recorder/ws', { websocket: true }, (connection, request) => {
    const ws = connection.socket;
    const sessionId = (request.query as any).sessionId;

    if (!sessionId) {
      ws.send(JSON.stringify({ type: 'error', message: 'sessionId is required' }));
      ws.close();
      return;
    }

    const session = getSession(sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      ws.close();
      return;
    }

    // Stream captured steps to the client
    const onStep = (step: any) => {
      try {
        ws.send(JSON.stringify({ type: 'step', step }));
      } catch {
        // socket may have closed
      }
    };

    const onDisconnect = () => {
      try {
        ws.send(JSON.stringify({ type: 'disconnect' }));
        ws.close();
      } catch {
        // socket may have closed
      }
    };

    session.emitter.on('step', onStep);
    session.emitter.on('disconnect', onDisconnect);

    ws.on('close', () => {
      session.emitter.off('step', onStep);
      session.emitter.off('disconnect', onDisconnect);
    });
  });
}
