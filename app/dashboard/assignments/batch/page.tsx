
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BatchAssignmentForm from "@/components/BatchAssignmentForm";

export default async function BatchAssignmentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "researcher") {
    redirect("/dashboard");
  }

  const { data: evaluators, error: evaluatorError } =
    await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "evaluator")
      .order("full_name");

  const { data: poolRows, error: poolError } =
    await supabase
      .from("videos")
      .select("study_pool")
      .not("study_pool", "is", null);

  if (evaluatorError || poolError) {
    throw new Error("Unable to load study setup data.");
  }

  const pools = [
    ...new Set(
      (poolRows ?? [])
        .map((row) => row.study_pool)
        .filter((pool): pool is string => Boolean(pool))
    ),
  ].sort();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href="/dashboard"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-bold">
        Batch Assignment
      </h1>

      <p className="mt-2 text-gray-600">
        Randomly distribute distinct videos across evaluators.
      </p>

      <BatchAssignmentForm
        evaluators={evaluators ?? []}
        pools={pools}
      />
    </main>
  );
}
