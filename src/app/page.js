"use client";

import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState(null);
  const [imgSrc, setImgSrc] = useState("");
  const [jsonResult, setJsonResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setJsonResult(null);
    setImgSrc(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
  
    const b64 = await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result.split(",")[1]);
      fr.readAsDataURL(file);
    });
  
    try {
      // Send image to proxy route
      const res = await fetch("/api/runpod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            image_base64: b64,
            image_name: file.name
          }
        }),
      });
  
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setJsonResult(data);
    } catch (err) {
      console.error(err);
      setJsonResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      {/* controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {/* file picker as button */}
        <label
          style={{
            display: "inline-block",
            padding: "0.5rem 1rem",
            backgroundColor: "#0070f3",
            color: "#fff",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          {file?.name ?? "Choose File"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>

        {/* submit button */}
        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: !file || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Processing…" : "Run Prediction"}
        </button>
      </div>

      {/* preview */}
      {imgSrc && (
        <div style={{ marginBottom: "1rem", textAlign: "center" }}>
          <img
            src={imgSrc}
            alt="Input preview"
            style={{ maxWidth: "100%", borderRadius: 8 }}
          />
        </div>
      )}

      {/* JSON output */}
      <div>
        <h2>Predictions JSON</h2>
        {loading && <p>Processing image, please wait…</p>}
        {jsonResult && (
          <pre
            style={{
              backgroundColor: "#f6f8fa",
              padding: "1rem",
              borderRadius: 4,
              overflowX: "auto",
              color: "black",
            }}
          >
            {JSON.stringify(jsonResult, null, 2)}
          </pre>
        )}
        {/* download link */}
        {jsonResult && !jsonResult.error && (
          <a
            href={
              "data:application/json;charset=utf-8," +
              encodeURIComponent(JSON.stringify(jsonResult, null, 2))
            }
            download={`${file.name.replace(/\.[^.]+$/, "")}_predictions.json`}
            style={{
              display: "inline-block",
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#0070f3",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            Download JSON
          </a>
        )}
      </div>
    </div>
  );
}
