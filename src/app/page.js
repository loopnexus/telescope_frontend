"use client"

import { useState } from "react"

export default function Page() {
  const [file, setFile]     = useState(null)
  const [maskUrl, setMaskUrl] = useState(null)
  const [busy, setBusy]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setBusy(true)

    // read file as base64
    const b64 = await new Promise(resolve => {
      const fr = new FileReader()
      fr.onload = ()=> resolve(fr.result.split(",")[1])
      fr.readAsDataURL(file)
    })

    // call RunPod serverless
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_RUNPOD_URL}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_RUNPOD_TOKEN}`
        },
        body: JSON.stringify({ input: { image_base64: b64 } })
      }
    )
    const payload = await res.json()
    if (payload.error) {
      alert(payload.error)
    } else {
      setMaskUrl(`data:image/png;base64,${payload.output.mask_base64}`)
    }

    setBusy(false)
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Telescope Segmentation</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files[0])}
        />
        <button type="submit" disabled={busy} style={{ marginLeft: 10 }}>
          {busy ? "Processing…" : "Go"}
        </button>
      </form>

      {maskUrl && (
        <div style={{ marginTop: 20 }}>
          <h2>Mask Output</h2>
          <img src={maskUrl} alt="segmentation mask" style={{ maxWidth: "100%" }} />
        </div>
      )}
    </main>
  )
}
