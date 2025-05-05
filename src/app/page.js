'use client'
import { useState } from 'react'

export default function Home() {
  const [file, setFile] = useState(null)
  const [preds, setPreds] = useState(null)
  const [loading, setLoading] = useState(false)

  // convert File → Base64 (no data: prefix)
  const toBase64 = (f) =>
    new Promise((res, rej) => {
      const reader = new FileReader()
      reader.readAsDataURL(f)
      reader.onload = () => {
        const b64 = reader.result.split(',')[1]
        res(b64)
      }
      reader.onerror = rej
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    const b64 = await toBase64(file)

    // direct call to RunPod
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_RUNPOD_URL}/runsync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({ input: { image_base64: b64 } }),
      }
    )
    const json = await resp.json()
    setPreds(json.output.predictions)
    setLoading(false)
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl mb-4">Telescope Segmentation</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? 'Processing…' : 'Run Segmentation'}
        </button>
      </form>

      {preds && (
        <pre className="mt-6 bg-gray-100 p-4 rounded">
          {JSON.stringify(preds, null, 2)}
        </pre>
      )}
    </main>
  )
}
