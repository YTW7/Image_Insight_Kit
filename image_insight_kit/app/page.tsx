"use client";

import { useState } from "react";

type Prediction = { className: string; probability: number };
type Result = { predictions: Prediction[]; error?: string };

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
      <div
        className="h-full bg-neutral-800 rounded-full transition-all duration-500"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/classify", { method: "POST", body: formData });
      const data: Result = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Try another image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-lg font-medium text-neutral-900 tracking-tight">
            Image Insight
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            See what's in a photo, instantly, on-device.
          </p>
        </div>

        <label className="group relative flex flex-col items-center justify-center gap-1.5 border border-neutral-200 rounded-lg bg-neutral-50/50 py-10 cursor-pointer hover:border-neutral-300 hover:bg-neutral-50 transition-colors">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <span className="text-sm text-neutral-600">
            {file ? file.name : "Drop an image, or click to choose"}
          </span>
          <span className="text-xs text-neutral-400">JPG, PNG, WEBP</span>
        </label>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Selected"
            className="mt-4 w-full max-h-60 object-cover rounded-lg border border-neutral-200"
          />
        )}

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="mt-4 w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing…" : "Analyze image"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-8">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">
              What's in this image
            </p>
            <div className="space-y-3.5">
              {result.predictions.map((p) => (
                <div key={p.className}>
                  <div className="flex justify-between items-baseline text-sm">
                    <span className="text-neutral-800 capitalize">{p.className}</span>
                    <span className="text-neutral-400 text-xs tabular-nums">
                      {(p.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Bar value={p.probability} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}