
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyEvaluationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "evaluator") {
    redirect("/dashboard");
  }

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(`
    id,
    status,
    assigned_at,
    videos (
        id,
        title, 
        search_term
    )
    `)
    .eq("evaluator_id", user.id)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("Failed to load assignments:", error.message);
  }

  return (
    <main className="min-h-screen bg-[#080d1c] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-indigo-400 hover:text-indigo-300"
        >
          ← Home
        </Link>

        <div className="mt-8">
          <h1 className="text-4xl font-bold">My Evaluations</h1>
          <p className="mt-3 text-slate-400">
            Review your assigned health insurance videos and
            complete their evaluation rubrics.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-800 p-6">
              Unable to load assignments. Please try again.
            </div>
          ) : assignments?.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-8">
              <h2 className="text-xl font-semibold">
                No assignments yet
              </h2>
              <p className="mt-2 text-slate-400">
                Your researcher has not assigned you any videos yet.
              </p>
            </div>
          ) : (
            assignments?.map((assignment) => {
              const video = assignment.videos as unknown as {
              id: string;
              title: string;
              search_term: string | null;
            } | null;

              return (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {video?.title ?? "Untitled Video"}
                      </h2>

                        <p className="mt-2 text-sm text-slate-400">
                          Topic: {video?.search_term ?? "General"}
                        </p>

                      <p className="mt-2 text-sm text-indigo-300">
                        Status: {assignment.status.replaceAll("_", " ")}
                      </p>
                    </div>

                    <Link
                      href={`/my-evaluations/${assignment.id}`}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
                    >
                      {assignment.status === "completed"
                        ? "View Evaluation"
                        : "Start Evaluation"}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
