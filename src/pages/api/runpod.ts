import type { NextApiRequest, NextApiResponse } from 'next';

const RUNPOD_BASE_URL = process.env.NEXT_PUBLIC_RUNPOD_URL;
const RUNPOD_TOKEN = process.env.NEXT_PUBLIC_RUNPOD_TOKEN;

interface RunPodOutput {
  image?: string;
  seed?: number;
  [key: string]: unknown;
}

interface RunPodStatusResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: RunPodOutput[];
  error?: string;
  delayTime?: number;
  executionTime?: number;
}

async function checkJobStatus(jobId: string): Promise<RunPodStatusResponse> {
  const response = await fetch(`${RUNPOD_BASE_URL}/status/${jobId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RUNPOD_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }

  return response.json();
}

async function waitForCompletion(jobId: string, maxAttempts = 30): Promise<RunPodStatusResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const statusData = await checkJobStatus(jobId);
    
    if (statusData.status === 'COMPLETED') {
      return statusData;
    }
    
    if (statusData.status === 'FAILED') {
      throw new Error('Job failed');
    }
    
    // Wait for 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }
  
  throw new Error('Max attempts reached waiting for job completion');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Validate request body
    const { input } = req.body;
    if (!input || !input.image_base64) {
      return res.status(400).json({ error: 'No image_base64 provided' });
    }

    // Initial request to start the job
    const response = await fetch(`${RUNPOD_BASE_URL}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUNPOD_TOKEN}`,
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[RunPod Error]', error);
      return res.status(response.status).json({ error: 'RunPod request failed', details: error });
    }

    const { id: jobId } = await response.json();
    
    // Wait for job completion and get final result
    const result = await waitForCompletion(jobId);
    return res.status(200).json(result);
    
  } catch (err) {
    console.error('[RunPod Proxy Error]', err);
    return res.status(500).json({ error: 'RunPod request failed', details: err });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // adjust as needed
    }
  }
};
