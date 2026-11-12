
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

type Answer = "1" | "0" | "NA";
type VideoAccessible = boolean | null;

type Props = {
  questions: Question[];
  assignmentId?: string;
  assignedTopic?: string | null;
  initialAnswers?: Record<number, Answer>;
  initialComments?: Record<number, string>;
  initialVideoAccessible?: VideoAccessible;
  submitted?: boolean;
};

const naGuidance: Record<number, string> = {
  8: "Select N/A if the video contains no relevant numbers.",

  10: "Select N/A if the video is under 1 minute long, even if this criterion is met. For videos of 1 minute or longer, evaluate Yes or No.",

  11: "Select N/A if the video is under 1 minute long, even if this criterion is met. For videos of 1 minute or longer, evaluate Yes or No.",

  13: "Select N/A if the video is under 1 minute long, even if this criterion is met. For videos of 1 minute or longer, evaluate Yes or No.",

  16: "Select N/A if the video contains no visual aids to evaluate.",

  17: "Select N/A only if the video contains no visual aids. If visual aids are present but lack clear titles or captions where needed, select No.",

  18: "Select N/A if the video contains no illustrations or photographs to evaluate.",

  19: "Select N/A if the video contains no tables to evaluate.",

  24: "Select N/A if the video does not require the viewer to perform calculations.",

  25: "Select N/A if the video contains no charts, graphs, tables, or diagrams relevant to taking action.",

  30: "Select N/A if there is no on-screen text, or if all on-screen text is spoken aloud so viewers do not need to read it. Otherwise, evaluate whether the text is easy to read.",

  31: "Select N/A if the video has no spoken narration. Otherwise, evaluate whether the narration is clear and easy to understand.",
};

export default function EvaluationForm({
  questions,
  assignmentId,
  assignedTopic = null,
  initialAnswers = {},
  initialComments = {},
  initialVideoAccessible = null,
  submitted = false,
}: Props) {
  const router = useRouter();

  const [answers, setAnswers] =
    useState<Record<number, Answer>>(initialAnswers);

  const [comments, setComments] =
    useState<Record<number, string>>(initialComments);

  const [expandedComments, setExpandedComments] =
    useState<Record<number, boolean>>({});

  const [videoAccessible, setVideoAccessible] =
    useState<VideoAccessible>(
      initialVideoAccessible ??
        (Object.keys(initialAnswers).length > 0 ? true : null)
    );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false);

  const categories = [
    ...new Set(questions.map((q) => q.category)),
  ];

  const completed = questions.filter(
    (q) =>
      answers[q.id] === "1" ||
      answers[q.id] === "0" ||
      (q.allows_na && answers[q.id] === "NA")
  ).length;

  const progress = questions.length
    ? Math.round((completed / questions.length) * 100)
    : 0;

  const canSubmit =
    videoAccessible === true &&
    questions.length === 31 &&
    completed === questions.length &&
    !saving &&
    !isSubmitted;

  function selectAccessibility(value: boolean) {
    if (saving || isSubmitted) return;

    setVideoAccessible(value);
    setHasUnsavedChanges(true);
    setMessage("");
  }

  function selectAnswer(
    questionId: number,
    value: Answer
  ) {
    if (saving || isSubmitted) return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    if (value === "NA") {
      setExpandedComments((prev) => ({
        ...prev,
        [questionId]: true,
      }));
    }

    setHasUnsavedChanges(true);
    setMessage("");
  }

  function updateComment(
    questionId: number,
    value: string
  ) {
    if (saving || isSubmitted) return;

    setComments((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    setHasUnsavedChanges(true);
    setMessage("");
  }

  function toggleComment(questionId: number) {
    setExpandedComments((prev) => ({
      ...prev,
      [questionId]: !(
        prev[questionId] ??
        Boolean(comments[questionId]?.trim())
      ),
    }));
  }

  function isCommentExpanded(questionId: number) {
    return (
      expandedComments[questionId] ??
      Boolean(comments[questionId]?.trim())
    );
  }

  async function saveEvaluation(submit: boolean) {
    if (!assignmentId || saving || isSubmitted) return;

    if (videoAccessible !== true) {
      setMessage(
        "Confirm that you can watch the video first."
      );
      return;
    }

    if (submit && !canSubmit) {
      setMessage(
        `Please answer all ${questions.length} questions before submitting.`
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const responses = questions
      .filter(
        (q) =>
          answers[q.id] === "1" ||
          answers[q.id] === "0" ||
          (q.allows_na && answers[q.id] === "NA")
      )
      .map((q) => ({
        question_id: q.id,
        answer:
          answers[q.id] === "NA"
            ? null
            : Number(answers[q.id]),
        is_na: answers[q.id] === "NA",
        comment: comments[q.id]?.trim() || null,
      }));

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "save_evaluation",
        {
          p_assignment_id: assignmentId,
          p_responses: responses,
          p_submit: submit,
        }
      );

      if (error) throw error;

      setHasUnsavedChanges(false);

      if (submit) {
        setIsSubmitted(true);
        setMessage(
          "Evaluation submitted successfully!"
        );
      } else {
        setMessage(
          "Draft saved successfully!"
        );
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

  async function submitUnavailable() {
    if (
      !assignmentId ||
      saving ||
      isSubmitted ||
      videoAccessible !== false
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Submit this video as unavailable? " +
        "Any saved draft answers and comments will be discarded."
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "submit_unavailable_video",
        {
          p_assignment_id: assignmentId,
        }
      );

      if (error) throw error;

      setAnswers({});
      setComments({});
      setExpandedComments({});
      setIsSubmitted(true);
      setHasUnsavedChanges(false);

      setMessage(
        "Video successfully marked as unavailable."
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Unable to submit: ${error.message}`
          : "Unable to mark video as unavailable."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* VIDEO ACCESSIBILITY CHECK */}
      <section className="rounded-xl border border-indigo-500/30 bg-[#182136] p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-400">
          Video Accessibility Check
        </p>

        <h2 className="text-lg font-semibold">
          Can you access and watch this YouTube video?
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Please attempt to play the video before answering.
          Select No if the video is deleted, private,
          restricted, or otherwise cannot be watched.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isSubmitted || saving}
            onClick={() => selectAccessibility(true)}
            aria-pressed={videoAccessible === true}
            className={`rounded-lg border px-5 py-3 text-sm transition disabled:opacity-60 ${
              videoAccessible === true
                ? "border-indigo-400 bg-indigo-600 text-white"
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Yes, I can watch the video
          </button>

          <button
            type="button"
            disabled={isSubmitted || saving}
            onClick={() => selectAccessibility(false)}
            aria-pressed={videoAccessible === false}
            className={`rounded-lg border px-5 py-3 text-sm transition disabled:opacity-60 ${
              videoAccessible === false
                ? "border-amber-400 bg-amber-600 text-white"
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            No, the video is unavailable
          </button>
        </div>
      </section>

      {/* UNAVAILABLE VIDEO */}
      {videoAccessible === false && (
        <section className="rounded-xl border border-amber-500/30 bg-[#182136] p-6">
          <h2 className="text-lg font-semibold text-amber-300">
            Video Unavailable
          </h2>

          <p className="mt-3 text-sm text-slate-300">
            You do not need to complete the evaluation
            questions. This video will be recorded as
            unavailable.
          </p>

          {isSubmitted ? (
            <p className="mt-4 font-semibold text-emerald-400">
              This video has been marked as unavailable.
            </p>
          ) : assignmentId ? (
            <button
              type="button"
              disabled={saving}
              onClick={submitUnavailable}
              className="mt-5 rounded-lg bg-amber-600 px-5 py-3 font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {saving
                ? "Submitting..."
                : "Submit as Unavailable"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Preview mode: no changes will be saved.
            </p>
          )}
        </section>
      )}

      {/* EVALUATION FORM */}
      {videoAccessible === true && (
        <>

          {/* PROGRESS BAR */}
          <div className="sticky top-0 z-10 rounded-xl border border-white/10 bg-[#182136] p-5">
            <div className="flex justify-between text-sm">
              <span>Evaluation Progress</span>
              <span>
                {completed}/{questions.length}
              </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-slate-700">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            {hasUnsavedChanges && (
              <p className="mt-2 text-xs text-amber-300">
                You have unsaved changes.
              </p>
            )}
          </div>

          {/* EVALUATION GUIDELINES */}
          <section className="rounded-xl border border-indigo-500/30 bg-[#182136] p-5">
            <h2 className="mb-3 text-lg font-semibold text-indigo-300">
              Evaluation Guidelines
            </h2>

            <div className="space-y-3 text-sm leading-relaxed text-slate-300">
              <p>
                Please evaluate each criterion based on the
                video&apos;s content. Select Yes (1) or No (0)
                as appropriate. Where N/A is available,
                select it only when the criterion does not
                apply, using the guidance provided below
                the question.
              </p>

              <p>
                If you select N/A, please explain your
                reasoning in Additional Comments, even if
                it matches the suggested guidance. You may
                also provide your own rationale if you
                believe the criterion does not apply for
                another reason. Explanations are strongly
                encouraged but not required.
              </p>

              <p>
                You may also use Additional Comments to
                explain your Yes or No responses or provide
                specific examples from the video. These
                comments are optional.
              </p>

              <p>
                <strong className="text-slate-100">
                  Important:
                </strong>{" "}
                For Question 28, selecting Yes means the
                video contains misinformation, while No
                means you did not identify misinformation.
              </p>
            </div>
          </section>

          {/* QUESTION CATEGORIES */}
          {categories.map((category) => (
            <section
              key={category}
              className="rounded-xl border border-white/10 bg-[#182136] p-5"
            >
              <h2 className="mb-6 text-lg font-semibold">
                {category}
              </h2>

              <div className="space-y-6">
                {questions
                  .filter(
                    (q) => q.category === category
                  )
                  .map((q) => {
                    const commentOpen =
                      isCommentExpanded(q.id);

                    const hasComment =
                      Boolean(comments[q.id]?.trim());

                    const options: Answer[] =
                      q.allows_na
                        ? ["1", "0", "NA"]
                        : ["1", "0"];

                    return (
                      <div
                        key={q.id}
                        className="border-b border-white/10 pb-5 last:border-0"
                      >

                        {/* QUESTION */}
                        <p className="mb-4 text-sm">
                          <span className="mr-2 text-indigo-400">
                            {q.id}.
                          </span>
                          {q.question_text}
                        </p>

                        {/* ASSIGNED TOPIC FOR QUESTION 2 */}
                        {q.id === 2 && (
                          <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
                            <p className="text-xs font-medium text-indigo-300">
                              Assigned Health Insurance Topic
                            </p>

                            <p className="mt-1 text-sm font-semibold text-white">
                              {assignedTopic?.trim() ||
                                "Topic not available"}
                            </p>

                            <p className="mt-2 text-xs text-slate-400">
                              Evaluate whether this video
                              teaches about the specific
                              topic shown above, not just
                              health insurance in general.
                            </p>
                          </div>
                        )}

                        {/* ANSWER OPTIONS */}
                        <div className="flex flex-wrap gap-2">
                          {options.map((value) => (
                            <button
                              key={value}
                              type="button"
                              disabled={isSubmitted || saving}
                              onClick={() =>
                                selectAnswer(q.id, value)
                              }
                              aria-pressed={
                                answers[q.id] === value
                              }
                              className={`rounded-lg border px-4 py-2 text-sm transition disabled:opacity-60 ${
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

                        {/* N/A GUIDANCE */}
                        {q.allows_na && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-slate-400">
                              {naGuidance[q.id] ??
                                "Select N/A only if this criterion does not apply to the video."}
                            </p>

                            {answers[q.id] === "NA" && (
                              <p className="text-xs text-amber-300">
                                Please explain why you selected
                                N/A in Additional Comments,
                                even if your reason matches
                                the guidance above. You may
                                provide your own rationale
                                if you believe the criterion
                                does not apply for another
                                reason. Explanations are
                                strongly encouraged but not
                                required.
                              </p>
                            )}
                          </div>
                        )}

                        {/* EXPANDABLE COMMENTS */}
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() =>
                              toggleComment(q.id)
                            }
                            aria-expanded={commentOpen}
                            aria-controls={`comment-panel-${q.id}`}
                            className="flex items-center gap-2 text-sm text-indigo-400 transition hover:text-indigo-300"
                          >
                            <span>
                              {commentOpen ? "−" : "+"}
                            </span>

                            <span>
                              {commentOpen
                                ? "Hide explanation"
                                : hasComment
                                ? "View saved explanation"
                                : "Add explanation (optional)"}
                            </span>

                            {!commentOpen && hasComment && (
                              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                                Added
                              </span>
                            )}
                          </button>

                          {commentOpen && (
                            <div
                              id={`comment-panel-${q.id}`}
                              className="mt-3"
                            >
                              <label
                                htmlFor={`comment-${q.id}`}
                                className="mb-2 block text-sm text-slate-300"
                              >
                                {answers[q.id] === "NA"
                                  ? "N/A Rationale (Strongly Encouraged)"
                                  : "Additional Comments (Optional)"}
                              </label>

                              <textarea
                                id={`comment-${q.id}`}
                                value={
                                  comments[q.id] ?? ""
                                }
                                onChange={(e) =>
                                  updateComment(
                                    q.id,
                                    e.target.value
                                  )
                                }
                                disabled={
                                  isSubmitted || saving
                                }
                                maxLength={2000}
                                rows={2}
                                placeholder={
                                  answers[q.id] === "NA"
                                    ? "Explain why this criterion does not apply. You may use the guidance above or provide your own rationale..."
                                    : "Optional: Explain your Yes/No rating or provide an example from the video..."
                                }
                                className="w-full resize-y rounded-lg border border-slate-600 bg-[#10182b] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                              />

                              <p className="mt-2 text-xs text-slate-500">
                                {answers[q.id] === "NA"
                                  ? "Please provide a rationale for N/A, even if it matches the suggested guidance. Your explanation is strongly encouraged but optional."
                                  : "Comments are optional. You may explain your Yes/No rating or provide supporting examples from the video."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}

          {/* PREVIEW MODE OR SAVE AND SUBMIT */}
          {!assignmentId ? (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5 text-sm">
              <p className="font-semibold">
                Preview Mode
              </p>

              <p className="mt-2 text-slate-300">
                You can explore the rubric here.
                Responses are not saved in preview mode.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#182136] p-6">
              {isSubmitted ? (
                <p className="font-semibold text-emerald-400">
                  Evaluation completed.
                  Responses are read-only.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      saveEvaluation(false)
                    }
                    className="rounded-lg border border-slate-600 px-5 py-3 font-medium hover:bg-slate-700 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save Draft"}
                  </button>

                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={() =>
                      saveEvaluation(true)
                    }
                    className="rounded-lg bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Submit Evaluation
                  </button>
                </div>
              )}

              {message && (
                <p
                  role="status"
                  className="mt-4 text-sm text-indigo-300"
                >
                  {message}
                </p>
              )}

              {!isSubmitted &&
                completed < questions.length && (
                  <p className="mt-3 text-xs text-slate-400">
                    Answer all {questions.length} questions
                    to enable submission.
                  </p>
                )}
            </div>
          )}
        </>
      )}

      {/* INITIAL STATE */}
      {videoAccessible === null && (
        <p className="text-center text-sm text-slate-400">
          Please complete the video accessibility
          check to begin.
        </p>
      )}

      {/* UNAVAILABLE STATUS MESSAGE */}
      {videoAccessible === false && message && (
        <p
          role="status"
          className="text-sm text-indigo-300"
        >
          {message}
        </p>
      )}
    </div>
  );
}
