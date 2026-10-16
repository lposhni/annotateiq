
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Option = {
  id: string;
  full_name?: string | null;
  title?: string | null;
};

export default function CreateAssignmentForm({
  evaluators,
  videos,
}: {
  evaluators: Option[];
  videos: Option[];
}) {
  const router = useRouter();
  const [evaluatorId, setEvaluatorId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!evaluatorId || !videoId) {
      setError("Please select an evaluator and a video.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { error: rpcError } = await supabase.rpc(
        "create_assignment",
        {
          p_evaluator_id: evaluatorId,
          p_video_id: videoId,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to create assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-6 rounded-xl border border-white/10 bg-[#182136] p-6"
    >
      <div>
        <label
          htmlFor="evaluator"
          className="mb-2 block text-sm font-medium"
        >
          Evaluator
        </label>

        <select
          id="evaluator"
          value={evaluatorId}
          onChange={e => setEvaluatorId(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-600 bg-[#080d1c] px-4 py-3 text-white"
        >
          <option value="">Select an evaluator</option>

          {evaluators.map(evaluator => (
            <option key={evaluator.id} value={evaluator.id}>
              {evaluator.full_name ||
                `Evaluator ${evaluator.id.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="video"
          className="mb-2 block text-sm font-medium"
        >
          Video
        </label>

        <select
          id="video"
          value={videoId}
          onChange={e => setVideoId(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-600 bg-[#080d1c] px-4 py-3 text-white"
        >
          <option value="">Select a video</option>

          {videos.map(video => (
            <option key={video.id} value={video.id}>
              {video.title || "Untitled Video"}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !evaluatorId || !videoId}
        className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Creating Assignment..." : "Create Assignment"}
      </button>
    </form>
  );
}
