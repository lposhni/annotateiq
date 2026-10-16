
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateAssignmentForm from "@/components/CreateAssignmentForm";

export default async function NewAssignmentPage() {
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

  const { data: evaluators, error: evaluatorError } =
    await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "evaluator")
      .order("full_name");

  const { data: videos, error: videoError } =
    await supabase
      .from("videos")
      .select("id, title")
      .order("title");

  if (evaluatorError || videoError) {
    throw new Error(
      evaluatorError?.message ||
      videoError?.message ||
      "Unable to load assignment options"
    );
  }

  return (
    <main className="min-h-screen bg-[#080d1c] px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-8 text-3xl font-bold">
          Create Assignment
        </h1>

        <p className="mt-3 text-slate-400">
          Select an evaluator and a video to create a new
          evaluation assignment.
        </p>

        <CreateAssignmentForm
          evaluators={evaluators ?? []}
          videos={videos ?? []}
        />
      </div>
    </main>
  );
}
