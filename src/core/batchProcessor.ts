import type { PixelMatrix } from '../types/image.types';
import { fileToMatrix } from './algorithms/pixelMatrix';
import { exportAsImage } from './export';

export interface BatchJob {
  id: string;
  file: File;
  operations: { name: string; filterFn: (m: PixelMatrix) => PixelMatrix }[];
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export const processBatch = async (
  jobs: BatchJob[],
  onProgress: (jobId: string, status: BatchJob['status'], error?: string) => void
): Promise<void> => {
  for (const job of jobs) {
    if (job.status !== 'pending') continue;
    
    try {
      onProgress(job.id, 'processing');
      
      // Load image
      let matrix = await fileToMatrix(job.file);
      
      // Process sequentially to avoid blocking the UI entirely for a long time
      for (const op of job.operations) {
        // Sleep slightly to let UI breathe
        await new Promise(resolve => setTimeout(resolve, 0));
        matrix = op.filterFn(matrix);
      }
      
      // Strip extension from filename
      const filename = job.file.name.replace(/\.[^/.]+$/, "") + "_batch";
      
      // Export
      exportAsImage(matrix, filename, job.format, job.quality);
      
      onProgress(job.id, 'done');
    } catch (err: any) {
      console.error(`Batch processing error for ${job.file.name}:`, err);
      onProgress(job.id, 'error', err.message || 'Unknown error');
    }
  }
};
