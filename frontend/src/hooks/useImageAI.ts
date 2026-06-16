import { useState, useEffect, useRef, useCallback } from 'react';

export interface ImageAIState {
  isProcessing: boolean;
  progress: number;
  statusMessage: string;
  resultUrl: string | null;
  error: string | null;
}

export function useImageAI() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<ImageAIState>({
    isProcessing: false,
    progress: 0,
    statusMessage: '',
    resultUrl: null,
    error: null,
  });

  useEffect(() => {
    // Create the worker
    workerRef.current = new Worker(new URL('../lib/image-ai-worker.ts', import.meta.url));

    const onMessageReceived = (e: MessageEvent) => {
      const { status, resultUrl, error, message } = e.data;

      if (status === 'progress') {
        setState(s => ({ ...s, statusMessage: message || 'Processing...' }));
      } else if (status === 'complete') {
        setState(s => ({ 
          ...s, 
          isProcessing: false, 
          resultUrl,
          statusMessage: 'Complete'
        }));
      } else if (status === 'error') {
        setState(s => ({ 
          ...s, 
          isProcessing: false, 
          error,
          statusMessage: 'Error'
        }));
      }
    };

    workerRef.current.addEventListener('message', onMessageReceived);

    return () => {
      workerRef.current?.removeEventListener('message', onMessageReceived);
      workerRef.current?.terminate();
    };
  }, []);

  const processImage = useCallback((action: 'removeBackground' | 'detectDepth', imageUrl: string) => {
    setState({
      isProcessing: true,
      progress: 0,
      statusMessage: 'Initializing AI...',
      resultUrl: null,
      error: null,
    });

    workerRef.current?.postMessage({
      id: Date.now().toString(),
      action,
      imageUrl,
    });
  }, []);

  return {
    ...state,
    processImage,
  };
}
