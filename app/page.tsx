
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function Home() {
  const [message, setMessage] = useState("Connecting...");

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from("videos")
        .select("id")
        .limit(1);

      if (error) {
        setMessage(`Connection error: ${error.message}`);
      } else {
        setMessage("Supabase connection successful!");
      }
    }

    testConnection();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">{message}</h1>
    </main>
  );
}
