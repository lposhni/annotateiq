
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Assignment = {
  id: string;
  evaluator_id: string;
  study_phase: string | null;
  status: string;
  assigned_at: string | null;
  videos: {
    id: string;
    title: string | null;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
};

type RawAssignment = {
  id: string;
  evaluator_id: string;
  study_phase: string | null;
  status: string;
  assigned_at: string | null;
  videos:
    | { id: string; title: string | null }
    | { id: string; title: string | null }[]
    | null;
  profiles:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

const participantIds = [
  "011a7a27-c4e2-4be6-affc-6de92590d297",
  "00ff06f2-1452-40ac-849c-804d52c35201",
  "933d16bd-cf78-460f-8c8c-35fabb4c119f",
  "c49e0056-496d-4a8a-9551-95c4cdf5392d",
  "91f4dbe5-de9b-4396-b05c-ab17efc22abc",
  "01c01f82-75bf-4fb9-9083-20616543413b",
];

const testEvaluatorId =
  "b39a147a-1db7-4cec-94bc-71d8834ca180";

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function getStats(assignments: Assignment[]) {
  const total = assignments.length;
  const completed = assignments.filter(
    (a) => a.status === "completed"
  ).length;
  const unavailable = assignments.filter(
    (a) => a.status === "unavailable"
  ).length;
  const inProgress = assignments.filter(
    (a) => a.status === "in_progress"
  ).length;
  const notStarted = assignments.filter(
    (a) => a.status === "assigned"
  ).length;

  const resolved = completed + unavailable;

  return {
    total,
    completed,
    unavailable,
    inProgress,
    notStarted,
    resolved,
    completionRate:
      total > 0 ? Math.round((resolved / total) * 100) : 0,
  };
}

function ProgressSection({
  title,
  description,
  assignments,
}: {
  title: string;
  description: string;
  assignments: Assignment[];
}) {
  const stats = getStats(assignments);

  const cards = [
    { label: "Total Assigned", value: stats.total },
    { label: "Completed", value: stats.completed },
    { label: "Unavailable", value: stats.unavailable },
    { label: "In Progress", value: stats.inProgress },
    { label: "Not Started", value: stats.notStarted },
  ];

  return (
    <section className="mt-8 rounded-xl border border-white/10 bg-[#182136] p-6">
      <h2 className="text-xl font-semibold">{title}</h2>

      <p className="mt-2 text-sm text-slate-400">
        {description}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-white/10 bg-[#10182b] p-4"
          >
            <p className="text-sm text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <h3 className="font-semibold">Progress</h3>
        <span className="font-medium text-indigo-300">
          {stats.completionRate}%
        </span>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${stats.completionRate}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-slate-400">
        {stats.resolved} of {stats.total} assignments resolved
        ({stats.completed} completed, {stats.unavailable} unavailable)
      </p>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "researcher") {
    redirect("/my-evaluations");
  }

  // Fetch every assignment using pagination.
  const assignments: Assignment[] = [];
  let loadError: string | null = null;
  const pageSize = 500;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("assignments")
      .select(`
        id,
        evaluator_id,
        study_phase,
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
      .order("assigned_at", { ascending: false })
      .order("id", { ascending: true })
      .range(start, start + pageSize - 1);

    if (error) {
      console.error("Failed to load assignments:", error);
      loadError = error.message;
      break;
    }

    const page = (data ?? []) as RawAssignment[];

    assignments.push(
      ...page.map((assignment) => ({
        id: assignment.id,
        evaluator_id: assignment.evaluator_id,
        study_phase: assignment.study_phase,
        status: assignment.status,
        assigned_at: assignment.assigned_at,
        videos: firstRelation(assignment.videos),
        profiles: firstRelation(assignment.profiles),
      }))
    );

    if (page.length < pageSize) {
      break;
    }
  }

  // Separate official study assignments from test data.
  const participantAssignments = assignments.filter(
    (a) =>
      a.study_phase === "independent" &&
      participantIds.includes(a.evaluator_id)
  );

  const researcherAssignments = assignments.filter(
    (a) => a.study_phase === "researcher_reference"
  );

  const testAssignments = assignments.filter(
    (a) => a.evaluator_id === testEvaluatorId
  );

  const officialAssignments = [
    ...participantAssignments,
    ...researcherAssignments,
  ];

  const officialStats = getStats(officialAssignments);

  const knownIds = new Set([
    ...participantAssignments.map((a) => a.id),
    ...researcherAssignments.map((a) => a.id),
    ...testAssignments.map((a) => a.id),
  ]);

  const uncategorizedAssignments = assignments.filter(
    (a) => !knownIds.has(a.id)
  );

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

        {loadError ? (
          <div className="mt-10 rounded-xl border border-red-700 bg-red-950/30 p-5 text-red-300">
            Unable to load assignments: {loadError}
          </div>
        ) : (
          <>
            <div className="mt-10 rounded-xl border border-indigo-500/30 bg-[#182136] p-6">
              <h2 className="text-xl font-semibold">
                Official Study Overview
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Participant and researcher-reference evaluations.
                Test assignments are excluded.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-400">
                    Total Official Assignments
                  </p>
                  <p className="mt-2 text-4xl font-bold">
                    {officialStats.total}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">
                    Resolved
                  </p>
                  <p className="mt-2 text-4xl font-bold">
                    {officialStats.resolved}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">
                    Overall Progress
                  </p>
                  <p className="mt-2 text-4xl font-bold">
                    {officialStats.completionRate}%
                  </p>
                </div>
              </div>
            </div>

            <ProgressSection
              title="Participant Evaluations"
              description="Six evaluators, with 30 independent videos each."
              assignments={participantAssignments}
            />

            <ProgressSection
              title="Researcher Reference Evaluations"
              description="Your 200 researcher-reference assignments."
              assignments={researcherAssignments}
            />

            <ProgressSection
              title="Test Evaluations"
              description="Test account activity. Excluded from official study progress."
              assignments={testAssignments}
            />

            {uncategorizedAssignments.length > 0 && (
              <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                <h2 className="font-semibold text-amber-200">
                  Uncategorized Assignments
                </h2>
                <p className="mt-2 text-sm text-amber-100">
                  {uncategorizedAssignments.length} assignments
                  do not match the expected study groups.
                  Review their study phase and evaluator IDs.
                </p>
              </div>
            )}

            <section className="mt-8 rounded-xl border border-white/10 bg-[#182136] p-6">
              <h2 className="text-xl font-semibold">
                Evaluator Assignments
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Track assigned videos and their evaluation status.
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
                        <th className="pb-4 pr-4">Study Phase</th>
                        <th className="pb-4 pr-4">Status</th>
                        <th className="pb-4">Assigned</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignments.map((assignment) => (
                        <tr
                          key={assignment.id}
                          className="border-b border-white/10 last:border-0"
                        >
                          <td className="py-4 pr-4 font-medium">
                            {assignment.videos?.title ||
                              "Untitled Video"}
                          </td>

                          <td className="py-4 pr-4 text-slate-300">
                            {assignment.evaluator_id === testEvaluatorId
                              ? "Test Evaluator"
                              : assignment.profiles?.full_name ||
                                `Evaluator ${assignment.evaluator_id.slice(0, 8)}`}
                          </td>

                          <td className="py-4 pr-4 text-slate-400">
                            {assignment.study_phase?.replaceAll(
                              "_",
                              " "
                            ) || "—"}
                          </td>

                          <td className="py-4 pr-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                assignment.status === "completed"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : assignment.status === "unavailable"
                                  ? "bg-rose-500/15 text-rose-300"
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
                              ? new Date(
                                  assignment.assigned_at
                                ).toLocaleDateString("en-US")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
