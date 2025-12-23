import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(248,237,225,0.9),_rgba(254,254,255,0.7)_45%,_rgba(235,240,255,0.7)_70%)]">
      <div className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-[conic-gradient(from_200deg,_rgba(59,130,246,0.2),_rgba(248,113,113,0.1),_rgba(251,191,36,0.15))] blur-3xl motion-safe:animate-[float-slow_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -left-10 bottom-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.18),_rgba(255,255,255,0))] blur-3xl motion-safe:animate-[float-slow_14s_ease-in-out_infinite]" />

      <main className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-7 motion-safe:animate-[fade-up_0.9s_ease-out_forwards]">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              English practice hub
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Build a consistent English routine with your group.
            </h1>
            <p className="text-lg text-muted-foreground">
              Organize study circles, track progress, and keep motivation high with shared goals and quick check-ins.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/register">Create account</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Weekly prompts
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Shared group cadence
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Invite-only circles
              </div>
            </div>
          </div>

          <div className="relative motion-safe:animate-[fade-up_1.1s_ease-out_forwards]">
            <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-white/70 via-white/20 to-white/60 blur-2xl" />
            <div className="relative rounded-[28px] border bg-card/90 p-6 shadow-soft-xl backdrop-blur">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today</p>
                    <p className="text-2xl font-semibold">Micro practice</p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    3 tasks
                  </span>
                </div>
                <div className="space-y-4 rounded-2xl border bg-background/70 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Warm-up</span>
                    <span className="text-muted-foreground">5 min</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Talk about your day in 4 sentences.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Group vibe</p>
                    <p className="text-lg font-semibold">Steady pace</p>
                    <p className="text-xs text-muted-foreground">6 of 8 members checked in</p>
                  </div>
                  <div className="rounded-2xl border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Next event</p>
                    <p className="text-lg font-semibold">Role play</p>
                    <p className="text-xs text-muted-foreground">Tomorrow, 18:30</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
