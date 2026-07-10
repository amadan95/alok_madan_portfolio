import Link from "next/link";

export default function NotFound() {
  return (
    <main className="text-page-experience" data-kind="disclaimer">
      <section className="text-page-experience__content">
        <div className="text-page-experience__column is-main" style={{ opacity: 1 }}>
          <p>This sequence isn’t here.</p>
        </div>
        <div className="text-page-experience__column is-side" style={{ opacity: 1 }}>
          <p>The address may have changed. Return to the portfolio.</p>
          <p>
            <Link href="/">View the portfolio</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
