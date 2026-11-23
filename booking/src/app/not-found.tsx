import Link from "next/link";
export default function NotFound() {
  return (
    <main className="wrap flex min-h-[70svh] flex-col items-start justify-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-4 text-5xl">Ez az oldal nem található</h1>
      <Link href="/" className="btn btn-ghost mt-10">Főoldal</Link>
    </main>
  );
}
