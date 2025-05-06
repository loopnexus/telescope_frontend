"use client"

import { useState, useEffect } from "react"

export default function Page() {
  const [file, setFile]         = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [jsonResp, setJsonResp] = useState(null)
  const [jsonUrl, setJsonUrl]   = useState(null)
  const [busy, setBusy]         = useState(false)

  // when the user picks a file, create a preview URL
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setJsonResp(null)
    setJsonUrl(null)

    // 1) read file → base64 (strip data: prefix)
    const b64 = await new Promise(resolve => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result.split(",")[1])
      fr.readAsDataURL(file)
    })

    // 2) call your RunPod JSON-returning handler
    const res = await fetch(
      process.env.NEXT_PUBLIC_RUNPOD_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_RUNPOD_TOKEN}`,
        },
        body: JSON.stringify({
          input: {
            image_base64: b64,
            image_name: file.name,
          },
        }),
      }
    );
    
    const json = await res.json()
    if (json.error) {
      alert(json.error)
      setBusy(false)
      return
    }

    // 3) save JSON in state, create a download URL
    setJsonResp(json)
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" })
    const url  = URL.createObjectURL(blob)
    setJsonUrl(url)

    setBusy(false)
  }

  return (
    <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Telescope Predictions</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files[0] || null)}
        />
        <button type="submit" disabled={busy || !file} style={{ marginLeft: 10 }}>
          {busy ? "Processing…" : "Run Segmentation"}
        </button>
      </form>

      {imagePreview && (
        <div style={{ marginBottom: 20 }}>
          <h2>Input Image</h2>
          <img src={imagePreview} alt="preview" style={{ maxWidth: "100%" }} />
        </div>
      )}

      {jsonResp && (
        <div>
          <h2>Predictions JSON</h2>
          <pre
            style={{
              maxHeight: 400,
              overflow: "auto",
              background: "#f5f5f5",
              padding: 10,
              borderRadius: 4,
              fontSize: 14,
              lineHeight: 1.4
            }}
          >
            {JSON.stringify(jsonResp, null, 2)}
          </pre>
          {jsonUrl && (
            <a
              href={jsonUrl}
              download={`${file?.name || "predictions"}.json`}
              style={{
                display: "inline-block",
                marginTop: 10,
                padding: "8px 12px",
                background: "#0070f3",
                color: "white",
                textDecoration: "none",
                borderRadius: 4
              }}
            >
              Download JSON
            </a>
          )}
        </div>
      )}
    </main>
  )
}
