
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: number;
  category: string;
  question_text: string;
  allows_na: boolean;
};

type Answer = "1" | "0" | "na";

type Props = {
  questions: Question[];
  assignmentId?: string;
  initialAnswers?: Record<number, Answer>;
  submitted?: boolean;
};

export default function EvaluationForm({
  questions,
  assignmentId,
  initialAnswers = {},
  submitted = false,
}: Props) {
  const router = useRouter();

  const [answers, setAnswers] =
    useState<Record<number, Answer>>(initialAnswers);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const categories = [...new Set(questions.map(q => q.category))];

  const completed = questions.filter(
    q => answers[q.id] !== undefined
  ).length;

  const progress = questions.length
    ? Math.round((completed / questions.length) * 100)
    : 0;

  const canSubmit =
    questions.length === 29 &&
    completed === questions.length &&
    !saving &&
    !isSubmitted;

  async function saveEvaluation(submit: boolean) {
    if (!assignmentId || saving || isSubmitted) return;

    if (submit && !canSubmit) {
      setMessage("Please answer all 29 questions before submitting.");
      return;
    }

    setSaving(true);
    setMessage("");

    const responses = questions
      .filter(q => answers[q.id] !== undefined)
      .map(q => {
        const value = answers[q.id];

        return {
          question_id: q.id,
          answer: value === "na" ? null : Number(value),
          is_na: value === "na",
        };
      });

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc("save_evaluation", {
        p_assignment_id: assignmentId,
        p_responses: responses,
        p_submit: submit,
      });

      if (error) throw error;

      setHasUnsavedChanges(false);

      if (submit) {
        setIsSubmitted(true);
        setMessage("Evaluation submitted successfully!");
      } else {
        setMessage("Draft saved successfully!");
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Unable to save: ${error.message}`
          : "Unable to save evaluation."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 rounded-xl border border-white/10 bg-[#182136] p-5">
        <div className="flex justify-between text-sm">
          <span>Evaluation Progress</span>
          <span>{completed}/{questions.length}</span>
        </div>

        <div className="mt-3 h-2 rounded-full bg-slate-700">
          <div
            className="h-2 rounded-full bg-indigo-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {hasUnsavedChanges && (
          <p className="mt-2 text-xs text-amber-300">
            You have unsaved changes.
          </p>
        )}
      </div>

      {categories.map(category => (
        <section
          key={category}
          className="rounded-xl border border-white/10 bg-[#182136] p-5"
        >
          <h2 className="mb-6 text-lg font-semibold">
            {category}
          </h2>

          <div className="space-y-6">
            {questions
              .filter(q => q.category === category)
              .map(q => (
                <div
                  key={q.id}
                  className="border-b border-white/10 pb-5 last:border-0"
                >
                  <p className="mb-4 text-sm">
                    <span className="mr-2 text-indigo-400">
                      {q.id}.
                    </span>
                    {q.question_text}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(["1", "0", "na"] as Answer[])
                      .filter(
                        value =>
                          value !== "na" || q.allows_na
                      )
                      .map(value => (
                        <button
                          key={value}
                          type="button"
                          disabled={isSubmitted || saving}
                          onClick={() => {
                            setAnswers(prev => ({
                              ...prev,
                              [q.id]: value,
                            }));
                            setHasUnsavedChanges(true);
                            setMessage("");
                          }}
                          aria-pressed={answers[q.id] === value}
                          className={`rounded-lg border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            answers[q.id] === value
                              ? "border-indigo-400 bg-indigo-600 text-white"
                              : "border-slate-600 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {value === "1"
                            ? "Yes (1)"
                            : value === "0"
                            ? "No (0)"
                            : "N/A"}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}

      {!assignmentId ? (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5 text-sm">
          <p className="font-semibold">Preview Mode</p>
          <p className="mt-2 text-slate-300">
            You can explore the rubric here.
            Responses are not saved in preview mode.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#182136] p-6">
          {isSubmitted ? (
            <p className="font-semibold text-emerald-400">
              Evaluation completed. Responses are read-only.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => saveEvaluation(false)}
                className="rounded-lg border border-slate-600 px-5 py-3 font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => saveEvaluation(true)}
                className="rounded-lg bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit Evaluation
              </button>
            </div>
          )}

          {message && (
            <p role="status" className="mt-4 text-sm text-indigo-300">
              {message}
            </p>
          )}

          {!isSubmitted && completed < questions.length && (
            <p className="mt-3 text-xs text-slate-400">
              Answer all {questions.length} questions to enable submission.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
