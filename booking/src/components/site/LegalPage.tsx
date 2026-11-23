import { Header } from "./Header";

export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <>
      <Header />
      <main id="tartalom" className="wrap max-w-3xl pt-14 md:pt-24">
        <h1 className="display text-[clamp(2.4rem,5vw,3.8rem)]">{title}</h1>
        <div className="hairline mt-8 mb-10 w-32" />
        <div className="space-y-4 whitespace-pre-line text-ink-soft">{body}</div>
      </main>
    </>
  );
}
