
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: number;
  category: string;
  question_text: string;
  allows_na: boolean;
};

type Answer = "1" | "0" | "na";

const supabase = createClient();

export default function RubricPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      const { data, error } = await supabase
        .from("rubric_questions")
        .select("id, category, question_text, allows_na")
        .order("id");

      if (error) {
        setError(error.message);
      } else {
        setQuestions(data || []);
      }

      setLoading(false);
    }

    loadQuestions();
  }, []);

  const completed = Object.keys(answers).length;
  const progress = questions.length
    ? Math.round((completed / questions.length) * 100)
    : 0;

  const categories = [...new Set(questions.map(q => q.category))];

  function updateAnswer(id: number, value: Answer) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  return (
    <main className="min-h-screen bg-[#0B1020] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard"
          className="text-indigo-400 hover:text-indigo-300"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold">
            Evaluation Rubric
          </h1>
          <p className="mt-2 text-slate-400">
            Health Insurance Video Quality Assessment
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#182136] p-6">
          <div className="flex justify-between">
            <span>Evaluation Progress</span>
            <span>{completed}/{questions.length}</span>
          </div>

          <div className="mt-4 h-2 rounded-full bg-slate-700">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {loading && (
          <p className="mt-8">Loading rubric...</p>
        )}

        {error && (
          <p className="mt-8 text-red-400">{error}</p>
        )}

        {categories.map(category => (
          <section
            key={category}
            className="mt-6 rounded-2xl border border-white/10 bg-[#182136] p-6"
          >
            <h2 className="mb-6 text-xl font-semibold">
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
                    <p className="mb-4">
                      <span className="mr-2 text-indigo-400">
                        {q.id}.
                      </span>
                      {q.question_text}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {(["1", "0", "na"] as Answer[])
                        .filter(value => value !== "na" || q.allows_na)
                        .map(value => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateAnswer(q.id, value)}
                            aria-pressed={answers[q.id] === value}
                            className={`rounded-lg border px-5 py-2 transition ${
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

        <div className="mt-8 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5">
          <p className="font-semibold">
            Preview Mode
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Responses are currently stored only in browser
            memory. Database saving will be added after
            evaluator assignments and security policies
            are configured.
          </p>
          <p className="mt-3 text-sm text-indigo-300">
            {completed} of {questions.length} criteria answered
          </p>
        </div>
      </div>
    </main>
  );
}
