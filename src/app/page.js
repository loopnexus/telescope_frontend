"use client";

import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState(null);
  const [json, setJson] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    // 1) read file → base64 (strip off the data: prefix)
    const b64 = await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result.split(",")[1]);
      fr.readAsDataURL(file);
    });

    // 2) call your RunPod JSON-returning handler
    const res = await fetch(process.env.NEXT_PUBLIC_RUNPOD_URL, {
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
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    setJson(data);
  }

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: 20,
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Telescope Predictions
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <label
          style={{
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Choose File:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>
        <button
          type="submit"
          disabled={!file}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: file ? "pointer" : "not-allowed",
            opacity: file ? 1 : 0.6,
          }}
        >
          Run Segmentation
        </button>
      </form>

      {file && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src={URL.createObjectURL(file)}
            alt="Input preview"
            style={{
              width: "100%",
              maxWidth: 600,
              height: "auto",
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          />
        </div>
      )}

      {json && (
        <section>
          <h2>Predictions JSON</h2>
          <pre
            style={{
              backgroundColor: "#f5f5f5",
              padding: 16,
              borderRadius: 8,
              overflowX: "auto",
              maxHeight: 400,
            }}
          >
            {JSON.stringify(json, null, 2)}
          </pre>
          <a
            href={
              "data:application/json;charset=utf-8," +
              encodeURIComponent(JSON.stringify(json, null, 2))
            }
            download={`${file.name}_predictions.json`}
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "10px 20px",
              backgroundColor: "#0070f3",
              color: "#fff",
              borderRadius: 4,
              textDecoration: "none",
            }}
          >
            Download JSON
          </a>
        </section>
      )}
    </main>
  );
}
