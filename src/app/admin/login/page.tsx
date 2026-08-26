import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin sign-in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-2xl font-bold">Admin</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        This area is locked. Set <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ADMIN_SECRET</code>{" "}
        in the environment, then open{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/admin?key=your-secret</code>.
      </p>
    </div>
  );
}
