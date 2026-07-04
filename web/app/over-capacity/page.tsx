export const metadata = {
  title: "bench: over capacity",
  robots: "noindex",
};

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #f7f6f3;
    color: #1a1a1a;
    font-family: ui-sans-serif, system-ui, sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  main { max-width: 540px; padding: 2.5rem 1.5rem; }
  h1 {
    font-family: ui-serif, Georgia, serif;
    font-size: 1.6rem;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 1.25rem;
    color: #111;
  }
  p {
    font-size: 0.975rem;
    line-height: 1.65;
    color: #444;
    margin-bottom: 1rem;
  }
  a { color: #555; text-decoration: underline; text-underline-offset: 3px; }
  a:hover { color: #111; }
`;

export default function OverCapacityPage() {
  return (
    <>
      <style>{styles}</style>
      <main>
        <h1>bench is over capacity right now.</h1>
        <p>
          We&apos;re hitting our daily compute cap. Come back in a few hours,
          your scan will land then. Nothing&apos;s broken; we just bought a
          small allowance and the day&apos;s worth has been used.
        </p>
        <p>
          <a href="/demo">see what bench scores →</a>
        </p>
      </main>
    </>
  );
}
