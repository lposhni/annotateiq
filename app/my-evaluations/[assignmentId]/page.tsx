
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EvaluationForm from "@/components/EvaluationForm";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const supabase = await createClient();

  // Get logged-in evaluator
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load assignment belonging to this evaluator
  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("assignments")
    .select("id, status, video_id")
    .eq("id", assignmentId)
    .eq("evaluator_id", user.id)
    .maybeSingle();

  if (assignmentError) {
    console.error(
      "Assignment lookup error:",
      assignmentError
    );
    throw new Error("Unable to load assignment");
  }

  if (!assignment) {
    notFound();
  }

  // Load video and its assigned health insurance topic
  const {
    data: video,
    error: videoError,
  } = await supabase
    .from("videos")
    .select("id, youtube_id, title, search_term")
    .eq("id", assignment.video_id)
    .single();

  if (videoError || !video) {
    console.error("Video lookup error:", videoError);
    notFound();
  }

  // Load evaluation questions
  const {
    data: questions,
    error: questionsError,
  } = await supabase
    .from("rubric_questions")
    .select("id, category, question_text, allows_na")
    .order("id");

  if (questionsError || !questions) {
    throw new Error("Unable to load evaluation rubric");
  }

  // Load existing evaluation, if any
  const {
    data: evaluation,
    error: evaluationError,
  } = await supabase
    .from("evaluations")
    .select("id, submitted_at, video_accessible")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (evaluationError) {
    throw new Error("Unable to load saved evaluation");
  }

  // Restore saved Yes, No, N/A answers and comments
  const initialAnswers: Record<
    number,
    "1" | "0" | "NA"
  > = {};

  const initialComments: Record<number, string> = {};

  if (evaluation) {
    const {
      data: responses,
      error: responsesError,
    } = await supabase
      .from("evaluation_responses")
      .select("question_id, answer, is_na, comment")
      .eq("evaluation_id", evaluation.id);

    if (responsesError) {
      throw new Error(
        "Unable to load saved answers and comments"
      );
    }

    for (const response of responses ?? []) {
      if (response.is_na === true) {
        initialAnswers[response.question_id] = "NA";
      } else if (response.answer === 1) {
        initialAnswers[response.question_id] = "1";
      } else if (response.answer === 0) {
        initialAnswers[response.question_id] = "0";
      }

      initialComments[response.question_id] =
        response.comment ?? "";
    }
  }

  // Determine whether evaluation is read-only
  const submitted =
    assignment.status === "completed" ||
    assignment.status === "unavailable" ||
    evaluation?.submitted_at != null;

  return (
    <main className="min-h-screen bg-[#080d1c] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">

        {/* BACK NAVIGATION */}
        <Link
          href="/my-evaluations"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Back to My Evaluations
        </Link>

        {/* VIDEO TITLE AND ASSIGNED TOPIC */}
        <div className="mb-8 mt-8">
          <h1 className="text-3xl font-bold">
            {video.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400">
              Assigned Health Insurance Topic:
            </span>

            <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm font-semibold text-indigo-300">
              {video.search_term || "Topic not available"}
            </span>
          </div>
        </div>

        {/* VIDEO AND EVALUATION FORM */}
        <div className="grid gap-8 lg:grid-cols-2">

          {/* VIDEO PLAYER */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
              <div className="aspect-video">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              Watch the video before completing the rubric.
              You may replay it as needed.
            </p>
          </div>

          {/* EVALUATION FORM */}
          <EvaluationForm
            questions={questions}
            assignmentId={assignment.id}
            assignedTopic={video.search_term ?? null}
            initialAnswers={initialAnswers}
            initialComments={initialComments}
            initialVideoAccessible={
              evaluation?.video_accessible ?? null
            }
            submitted={submitted}
          />

        </div>
      </div>
    </main>
  );
}
