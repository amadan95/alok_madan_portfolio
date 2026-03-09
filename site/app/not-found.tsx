import Link from "next/link";

export default function NotFound() {
  return (
    <main className="text-page-experience" data-kind="disclaimer">
      <section className="text-page-experience__content">
        <div className="text-page-experience__column is-main" style={{ opacity: 1 }}>
          <p>The requested sequence is missing.</p>
        </div>
        <div className="text-page-experience__column is-side" style={{ opacity: 1 }}>
          <p>The slug does not resolve to a public project. Return to the main portfolio to continue through the archive.</p>
          <p>
            <Link href="/">Back to portfolio</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
