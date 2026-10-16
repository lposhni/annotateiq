
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Assignment = {
  id: string;
  evaluator_id: string;
  status: string;
  assigned_at: string | null;
  videos: {
    id: string;
    title: string;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Restrict dashboard to researchers
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "researcher") {
    redirect("/my-evaluations");
  }

  // Load all assignments and related videos/evaluators
  const { data, error: assignmentsError } = await supabase
    .from("assignments")
    .select(`
      id,
      evaluator_id,
      status,
      assigned_at,
      videos (
        id,
        title
      ),
      profiles (
        full_name
      )
    `)
    .order("assigned_at", { ascending: false });

  if (assignmentsError) {
    console.error("Failed to load assignments:", assignmentsError.message);
  }


const assignments: Assignment[] = (data ?? []).map((assignment) => ({
  id: assignment.id,
  evaluator_id: assignment.evaluator_id,
  status: assignment.status,
  assigned_at: assignment.assigned_at,
  videos: assignment.videos?.[0] ?? null,
  profiles: assignment.profiles?.[0] ?? null,
}));

  const total = assignments.length;
  const completed = assignments.filter(
    a => a.status === "completed"
  ).length;
  const inProgress = assignments.filter(
    a => a.status === "in_progress"
  ).length;
  const notStarted = assignments.filter(
    a => a.status === "assigned"
  ).length;

  const completionRate =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { label: "Total Assigned", value: total },
    { label: "Completed", value: completed },
    { label: "In Progress", value: inProgress },
    { label: "Not Started", value: notStarted },
  ];

  return (
    <main className="min-h-screen bg-[#080d1c] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-400">
              AnnotateIQ / Researcher Workspace
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Research Dashboard
            </h1>

            <p className="mt-3 text-slate-400">
              Welcome, {profile.full_name || "Researcher"}!
              Monitor evaluator progress and manage your study.
            </p>
          </div>


      <div className="flex flex-wrap gap-3">
        <a
          href="/api/evaluations/export"
          download
          className="rounded-lg border border-indigo-400 px-5 py-3 font-medium text-indigo-300 transition hover:bg-indigo-500/10"
        >
          Export Evaluations CSV
        </a>

      <Link
        href="/dashboard/assignments/new"
        className="rounded-lg border border-indigo-400 px-5 py-3 font-medium text-indigo-300 transition hover:bg-indigo-500/10"
      >
        + Create Assignment
      </Link>

      {/* NEW: Batch Assignments */}
      <Link
        href="/dashboard/assignments/batch"
        className="rounded-lg border border-indigo-400 px-5 py-3 font-medium text-indigo-300 transition hover:bg-indigo-500/10"
      >
        + Batch Assignments
      </Link>

      <Link
        href="/dashboard/videos"
        className="rounded-lg bg-indigo-600 px-5 py-3 font-medium transition hover:bg-indigo-500"
      >
        View Video Library
      </Link>
    </div>

        </div>

        {assignmentsError ? (
          <div className="mt-10 rounded-xl border border-red-700 bg-red-950/30 p-5 text-red-300">
            Unable to load assignments: {assignmentsError.message}
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map(stat => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-[#182136] p-6"
                >
                  <p className="text-sm text-slate-400">
                    {stat.label}
                  </p>

                  <p className="mt-3 text-4xl font-bold">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-white/10 bg-[#182136] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Overall Completion
                </h2>

                <span className="font-medium text-indigo-300">
                  {completionRate}%
                </span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-slate-400">
                {completed} of {total} assignments completed
              </p>
            </div>

            <div className="mt-8 rounded-xl border border-white/10 bg-[#182136] p-6">
              <h2 className="text-xl font-semibold">
                Evaluator Assignments
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Track each assigned video and its evaluation status.
              </p>

              {assignments.length === 0 ? (
                <p className="mt-6 text-slate-400">
                  No assignments have been created yet.
                </p>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-slate-400">
                      <tr>
                        <th className="pb-4 pr-4">Video</th>
                        <th className="pb-4 pr-4">Evaluator</th>
                        <th className="pb-4 pr-4">Status</th>
                        <th className="pb-4">Assigned</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignments.map(assignment => (
                        <tr
                          key={assignment.id}
                          className="border-b border-white/10 last:border-0"
                        >
                          <td className="py-4 pr-4 font-medium">
                            {assignment.videos?.title ?? "Untitled Video"}
                          </td>

                          <td className="py-4 pr-4 text-slate-300">
                            {assignment.profiles?.full_name ||
                              `Evaluator ${assignment.evaluator_id.slice(0, 8)}`}
                          </td>

                          <td className="py-4 pr-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                assignment.status === "completed"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : assignment.status === "in_progress"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-slate-500/20 text-slate-300"
                              }`}
                            >
                              {assignment.status.replaceAll("_", " ")}
                            </span>
                          </td>

                          <td className="py-4 text-slate-400">
                            {assignment.assigned_at
                              ? new Date(assignment.assigned_at)
                                  .toLocaleDateString("en-US")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
