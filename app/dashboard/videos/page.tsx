
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function VideosPage() {
  // Connect to Supabase
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Check if user is a researcher
  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (profileError || profile?.role !== "researcher") {
    redirect("/my-evaluations");
  }

  // Get videos from the database
  const { data: videos, error } = await supabase
    .from("videos")
    .select(
      "id, youtube_id, title, channel_title, duration_seconds, search_term"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return <p>Error loading videos: {error.message}</p>;
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="text-indigo-400"
        >
          ← Back to Dashboard
        </Link>

       <h1 className="mt-8 rounded-xl bg-indigo-600 p-8 text-5xl font-bold text-white">
        Video Library
       </h1>

        <p className="mt-2 text-gray-400">
          Health insurance educational videos
        </p>

        <div className="mt-8 space-y-4">
          {videos?.map((video) => (
            <div
              key={video.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <Link
                href={`/dashboard/videos/${video.id}`}
                className="text-xl font-semibold hover:text-indigo-400"
                >
                {video.title}
              </Link>

              <p className="mt-2 text-sm text-gray-400">
                {video.channel_title || "Unknown channel"}
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Topic: {video.search_term || "Not specified"}
              </p>

              {video.youtube_id && (
                <a
                  href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-indigo-400 hover:underline"
                >
                  Watch on YouTube →
                </a>
              )}
            </div>
          ))}
        </div>

        {videos?.length === 0 && (
          <p className="mt-8 text-gray-400">
            No videos found in the database.
          </p>
        )}
      </div>
    </main>
  );
}
