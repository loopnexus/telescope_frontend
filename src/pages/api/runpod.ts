import type { NextApiRequest, NextApiResponse } from 'next';

const RUNPOD_BASE_URL = process.env.NEXT_PUBLIC_RUNPOD_URL;
const RUNPOD_TOKEN = process.env.NEXT_PUBLIC_RUNPOD_TOKEN;

// Validate environment variables
if (!RUNPOD_BASE_URL || !RUNPOD_TOKEN) {
  console.error('Missing required environment variables: RUNPOD_BASE_URL or RUNPOD_TOKEN');
}

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
  if (!RUNPOD_BASE_URL || !RUNPOD_TOKEN) {
    throw new Error('Missing RunPod configuration');
  }

  const response = await fetch(`${RUNPOD_BASE_URL}/status/${jobId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RUNPOD_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Status check failed: ${response.statusText}. Details: ${errorText}`);
  }

  return response.json();
}

async function waitForCompletion(jobId: string, maxAttempts = 100): Promise<RunPodStatusResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const statusData = await checkJobStatus(jobId);
      
      if (statusData.status === 'COMPLETED') {
        return statusData;
      }
      
      if (statusData.status === 'FAILED') {
        throw new Error(`Job failed: ${statusData.error || 'Unknown error'}`);
      }
      
      // Wait for 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      console.error(`Attempt ${attempts + 1} failed:`, error);
      throw error;
    }
  }
  
  // Return the last status instead of throwing an error
  const lastStatus = await checkJobStatus(jobId);
  return {
    ...lastStatus,
    error: 'Max attempts reached waiting for job completion'
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Validate environment variables
    if (!RUNPOD_BASE_URL || !RUNPOD_TOKEN) {
      throw new Error('Missing RunPod configuration');
    }

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
      const errorText = await response.text();
      console.error('[RunPod Error]', errorText);
      return res.status(response.status).json({ 
        error: 'RunPod request failed', 
        details: errorText 
      });
    }

    const { id: jobId } = await response.json();
    
    // Wait for job completion and get final result
    const result = await waitForCompletion(jobId);
    return res.status(200).json(result);
    
  } catch (err) {
    console.error('[RunPod Proxy Error]', err);
    return res.status(500).json({ 
      error: 'RunPod request failed', 
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    // Increase the timeout for Netlify
    maxDuration: 30
  }
};
