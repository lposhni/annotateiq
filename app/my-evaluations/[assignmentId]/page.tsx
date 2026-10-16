
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment, error: assignmentError } =
    await supabase
      .from("assignments")
      .select("id, status, video_id")
      .eq("id", assignmentId)
      .eq("evaluator_id", user.id)
      .single();

  if (assignmentError || !assignment) {
    console.error("Assignment error:", assignmentError);
    notFound();
  }

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, title, youtube_id")
    .eq("id", assignment.video_id)
    .single();

  if (videoError || !video) {
    console.error("Video error:", videoError);
    notFound();
  }

  const { data: questions, error: questionsError } =
    await supabase
      .from("rubric_questions")
      .select("id, category, question_text, allows_na")
      .order("id");

  if (questionsError || !questions) {
    throw new Error("Unable to load evaluation rubric");
  }

  const { data: evaluation, error: evaluationError } =
    await supabase
      .from("evaluations")
      .select("id, submitted_at")
      .eq("assignment_id", assignmentId)
      .maybeSingle();

  if (evaluationError) {
    throw new Error("Unable to load saved evaluation");
  }

  const initialAnswers: Record<number, "1" | "0" | "na"> = {};

  if (evaluation) {
    const { data: responses, error: responsesError } =
      await supabase
        .from("evaluation_responses")
        .select("question_id, answer, is_na")
        .eq("evaluation_id", evaluation.id);

    if (responsesError) {
      throw new Error("Unable to load saved answers");
    }

    for (const response of responses ?? []) {
      initialAnswers[response.question_id] = response.is_na
        ? "na"
        : response.answer === 1
          ? "1"
          : "0";
    }
  }

  const submitted =
    assignment.status === "completed" ||
    evaluation?.submitted_at != null;

  return (
    <main className="min-h-screen bg-[#080d1c] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/my-evaluations"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Back to My Evaluations
        </Link>

        <div className="mb-8 mt-8">
          <h1 className="text-3xl font-bold">{video.title}</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
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

          <EvaluationForm
            questions={questions}
            assignmentId={assignment.id}
            initialAnswers={initialAnswers}
            submitted={submitted}
          />
        </div>
      </div>
    </main>
  );
}
