export const metadata = { title: "Privacy | VELA" };

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: "0 24px", color: "#f6f6fa" }}>
      <h1>Privacy</h1>
      <p>
        VELA does not collect or store any personal data of its own beyond what signing in requires. Signing in
        uses BEAU, the shared sign-in for VELA and ORBI — see{" "}
        <a href="https://beau-self.vercel.app/privacy" style={{ textDecoration: "underline" }}>
          BEAU&apos;s privacy page
        </a>{" "}
        for what that account holds (email, and whichever of Google or GitHub you used to sign in). Signed in,
        VELA reads only your subscription status for this product (active, trialing, or not) to decide what to
        show you — it does not store your location, your filter choices, or anything else about how you use the
        guide. Signed out, the broadcast guide itself works the same way for everyone and reads nothing about
        you at all.
      </p>
      <p style={{ color: "#78c89a" }}>
        This page is a placeholder pending real legal review, not a complete privacy policy yet.
      </p>
    </main>
  );
}
