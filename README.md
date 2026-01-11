# ask-jenelle
AskJenelle™ — a private decision-clarity SaaS for founders, built on a 12-dimensional business consciousness model.
npx create-next-app@latest ask-jenelle --ts --app --eslint
cd ask-jenelle
npm install
npm i @supabase/supabase-js @supabase/ssr
npm i stripe
# OpenAI (or other LLM provider)
OPENAI_API_KEY=YOUR_KEY

# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Stripe (later step)
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUB
-- Profiles (stores tier + mode)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  plan text not null default 'free', -- free | pro | elite
  mode text not null default 'founder' -- founder | ceo | investor | creative | crisis | expansion
);

-- Daily usage limiter
create table if not exists public.usage_daily (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  day date not null,
  message_count int not null default 0,
  unique(user_id, day)
);

-- Basic RLS
alter table public.profiles enable row level security;
alter table public.usage_daily enable row level security;

-- Profiles policies
create policy "Profiles are viewable by owner"
on public.profiles for select
using (auth.uid() = id);

create policy "Profiles are updatable by owner"
on public.profiles for update
using (auth.uid() = id);

create policy "Profiles are insertable by owner"
on public.profiles for insert
with check (auth.uid() = id);

-- Usage policies
create policy "Usage rows are viewable by owner"
on public.usage_daily for select
using (auth.uid() = user_id);

create policy "Usage rows are insertable by owner"
on public.usage_daily for insert
with check (auth.uid() = user_id);

create policy "Usage rows are updatable by owner"
on public.usage_daily for update
using (auth.uid() = user_id);
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan, mode)
  values (new.id, 'free', 'founder')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
export const ASK_JENELLE_MASTER_PROMPT = `
ASK JENELLE™ — MASTER SYSTEM PROMPT
Version: v1.0 (Unified Intelligence, Behavior & Safety Layer)

You are Ask Jenelle™ — a business intelligence and decision-clarity assistant built on the 12-Dimensional Business Consciousness Model.

...PASTE THE FULL MASTER PROMPT HERE...
`;
"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleAuth() {
    setMsg(null);

    if (!email || !password) {
      setMsg("Enter email + password.");
      return;
    }

    const res = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (res.error) {
      setMsg(res.error.message);
      return;
    }

    router.push("/onboarding");
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1>Ask Jenelle™</h1>
      <p>{isSignup ? "Create your account" : "Log in"}</p>

      <label>Email</label>
      <input
        style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
      />

      <label>Password</label>
      <input
        type="password"
        style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />

      <button style={{ width: "100%", padding: 12 }} onClick={handleAuth}>
        {isSignup ? "Sign up" : "Log in"}
      </button>

      <button
        style={{ width: "100%", padding: 12, marginTop: 10 }}
        onClick={() => setIsSignup(!isSignup)}
      >
        {isSignup ? "I already have an account" : "Create an account"}
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const MODES = [
  { id: "founder", title: "Founder Mode", desc: "Clarity & momentum" },
  { id: "ceo", title: "CEO Mode", desc: "Systems & leadership" },
  { id: "investor", title: "Investor Mode", desc: "Risk & sustainability" },
  { id: "creative", title: "Creative Mode", desc: "Brand & resonance" },
  { id: "crisis", title: "Crisis Mode", desc: "Stabilization & calm" },
  { id: "expansion", title: "Expansion Mode", desc: "Growth & timing" },
] as const;

type ModeId = (typeof MODES)[number]["id"];

export default function OnboardingPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [mode, setMode] = useState<ModeId>("founder");
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("mode, plan")
        .eq("id", auth.user.id)
        .single();

      if (profile?.mode) setMode(profile.mode);
      if (profile?.plan) setPlan(profile.plan);
      setLoading(false);
    })();
  }, [router, supabase]);

  async function saveAndContinue() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.push("/login");

    await supabase.from("profiles").upsert({
      id: auth.user.id,
      mode,
      plan: plan ?? "free",
    });

    router.push("/chat");
  }

  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Welcome to Ask Jenelle™</h1>
      <p>Choose your decision mode. You can change this anytime.</p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              textAlign: "left",
              padding: 14,
              borderRadius: 12,
              border: "1px solid #333",
              background: mode === m.id ? "#111" : "#000",
              color: "#fff",
            }}
          >
            <div style={{ fontWeight: 700 }}>{m.title}</div>
            <div style={{ opacity: 0.8 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      <button
        style={{ marginTop: 18, padding: 12, width: "100%" }}
        onClick={saveAndContinue}
      >
        Continue
      </button>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("founder");
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.push("/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select("mode, plan")
        .eq("id", auth.user.id)
        .single();

      if (profile?.mode) setMode(profile.mode);
      if (profile?.plan) setPlan(profile.plan);
    })();
  }, [router, supabase]);

  async function updateMode(newMode: string) {
    setMode(newMode);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    await supabase.from("profiles").update({ mode: newMode }).eq("id", auth.user.id);
  }

  async function send() {
    setNotice(null);

    const text = input.trim();
    if (!text || loading) return;

    setLoading(true);
    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, mode }),
    });

    const data = await res.json();

    if (!res.ok) {
      setNotice(data?.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setMessages([...next, { role: "assistant", content: data.answer }]);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Ask Jenelle™</h2>
          <small style={{ opacity: 0.8 }}>Plan: {plan}</small>
        </div>

        <select value={mode} onChange={(e) => updateMode(e.target.value)}>
          <option value="founder">Founder</option>
          <option value="ceo">CEO</option>
          <option value="investor">Investor</option>
          <option value="creative">Creative</option>
          <option value="crisis">Crisis</option>
          <option value="expansion">Expansion</option>
        </select>
      </header>

      <section style={{ marginTop: 16, border: "1px solid #333", borderRadius: 12, padding: 12, minHeight: 420 }}>
        {messages.length === 0 ? (
          <p style={{ opacity: 0.8 }}>
            What decision do you need clarity on right now?
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>{m.role === "user" ? "You" : "Ask Jenelle"}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))
        )}
        {loading && <p style={{ opacity: 0.7 }}>Thinking…</p>}
      </section>

      {notice && <p style={{ marginTop: 10 }}>{notice}</p>}

      <footer style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #333" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
        />
        <button style={{ padding: "12px 16px" }} onClick={send}>
          Send
        </button>
      </footer>
    </main>
  );
}
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { ASK_JENELLE_MASTER_PROMPT } from "@/lib/askJenellePrompt";

// Simple OpenAI call via fetch (works anywhere)
async function callModel(systemPrompt: string, userText: string) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini", // change later if you want
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text);
  }
  const json = await resp.json();
  return json.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: Request) {
  try {
    const { message, mode } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message." }, { status: 400 });
    }

    const supabase = createSupabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    // Load profile (plan + mode)
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, mode")
      .eq("id", auth.user.id)
      .single();

    const plan = profile?.plan ?? "free";
    const effectiveMode = (mode ?? profile?.mode ?? "founder").toString();

    // Enforce Free tier daily limit
    const FREE_DAILY_LIMIT = 12;

    if (plan === "free") {
      const today = new Date();
      const day = today.toISOString().slice(0, 10); // YYYY-MM-DD

      const { data: usage } = await supabase
        .from("usage_daily")
        .select("message_count")
        .eq("user_id", auth.user.id)
        .eq("day", day)
        .single();

      const count = usage?.message_count ?? 0;

      if (count >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: "Daily limit reached on Free. Upgrade to Pro for unlimited access." },
          { status: 402 }
        );
      }

      if (!usage) {
        await supabase.from("usage_daily").insert({
          user_id: auth.user.id,
          day,
          message_count: 1,
        });
      } else {
        await supabase
          .from("usage_daily")
          .update({ message_count: count + 1 })
          .eq("user_id", auth.user.id)
          .eq("day", day);
      }
    }

    // Build the system prompt with mode context (safe)
    const modeDirective = `
CURRENT MODE: ${effectiveMode}
Apply the mode rules from the master prompt. Maintain consistent tone and risk tolerance for this mode.
`;

    const systemPrompt = `${ASK_JENELLE_MASTER_PROMPT}\n\n${modeDirective}`;

    const answer = await callModel(systemPrompt, message);

    return NextResponse.json({ answer });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error." },
      { status: 500 }
    );
  }
}
npm run dev
