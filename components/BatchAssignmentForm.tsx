
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Evaluator = {
  id: string;
  full_name: string | null;
};

type Props = {
  evaluators: Evaluator[];
  pools: string[];
};

export default function BatchAssignmentForm({
  evaluators,
  pools,
}: Props) {
  const [pool, setPool] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [videosPerEvaluator, setVideosPerEvaluator] = useState(30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const total = selectedIds.length * videosPerEvaluator;

  function toggleEvaluator(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: rpcError } = await supabase.rpc(
        "create_batch_assignments",
        {
          p_study_pool: pool,
          p_evaluator_ids: selectedIds,
          p_videos_per_evaluator: videosPerEvaluator,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setMessage(`Successfully created ${data} assignments!`);
      setSelectedIds([]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-6 rounded-xl border p-6"
    >
      <div>
        <label className="mb-2 block font-medium">
          Study Pool
        </label>
        <select
          value={pool}
          onChange={(e) => setPool(e.target.value)}
          className="w-full rounded-lg border p-3"
          required
        >
          <option value="">Select a study pool</option>
          {pools.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-3 block font-medium">
          Select Evaluators
        </label>

        <div className="space-y-3">
          {evaluators.map((evaluator) => (
            <label
              key={evaluator.id}
              className="flex items-center gap-3"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(evaluator.id)}
                onChange={() => toggleEvaluator(evaluator.id)}
              />
              <span>
                {evaluator.full_name ||
                  `Evaluator ${evaluator.id.slice(0, 8)}`}
              </span>
            </label>
          ))}
        </div>

        {evaluators.length === 0 && (
          <p className="text-sm text-gray-500">
            No evaluator accounts found.
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Videos per Evaluator
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={videosPerEvaluator}
          onChange={(e) =>
            setVideosPerEvaluator(Number(e.target.value))
          }
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
        <p>Selected evaluators: {selectedIds.length}</p>
        <p>Videos per evaluator: {videosPerEvaluator}</p>
        <p className="mt-2 font-semibold">
          Total assignments: {total}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={
          loading ||
          !pool ||
          selectedIds.length === 0 ||
          !Number.isInteger(videosPerEvaluator) ||
          videosPerEvaluator < 1 ||
          videosPerEvaluator > 100
        }
        className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Batch Assignments"}
      </button>
    </form>
  );
}
