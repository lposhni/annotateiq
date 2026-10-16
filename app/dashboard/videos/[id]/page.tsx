
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EvaluationForm from "@/components/EvaluationForm";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "researcher") {
    redirect("/my-evaluations");
  }

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, youtube_id, title, transcript, search_term")
    .eq("id", id)
    .single();

  if (videoError || !video) notFound();

  const { data: questions, error: rubricError } = await supabase
    .from("rubric_questions")
    .select("id, category, question_text, allows_na")
    .order("id");

  if (rubricError) {
    throw new Error(`Unable to load rubric: ${rubricError.message}`);
  }

  if (!questions || questions.length !== 29) {
    throw new Error("Expected 29 rubric questions.");
  }

  return (
    <main className="min-h-screen bg-[#0B1020] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/videos"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Back to Video Library
        </Link>

        <h1 className="mt-6 text-3xl font-bold">{video.title}</h1>
        <p className="mt-2 text-slate-400">
          Topic: {video.search_term || "Not specified"}
        </p>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6 lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#182136]">
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_id)}`}
                  title={video.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-[#182136] p-6">
              <h2 className="text-lg font-semibold">Video Transcript</h2>
              <div className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {video.transcript || "No transcript available yet."}
              </div>
            </section>
          </div>

          <div>
            <h2 className="mb-5 text-xl font-semibold">
              Evaluation Rubric
            </h2>
            <EvaluationForm questions={questions} />
          </div>
        </div>
      </div>
    </main>
  );
}
