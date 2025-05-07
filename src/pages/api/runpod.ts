import type { NextApiRequest, NextApiResponse } from 'next';

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

    // Forward request to RunPod
    const response = await fetch(`${process.env.NEXT_PUBLIC_RUNPOD_URL}/runsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_RUNPOD_TOKEN}`,
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[RunPod Error]', error);
      return res.status(response.status).json({ error: 'RunPod request failed', details: error });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[RunPod Proxy Error]', err);
    return res.status(500).json({ error: 'RunPod request failed', details: err.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // adjust as needed
    }
  }
};
