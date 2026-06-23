"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type PlanKey = "pro" | "proplus" | "max" | "teams";

const PRICES: Record<PlanKey, { m: number; y: number }> = {
  pro:     { m: 12,  y: 10  },
  proplus: { m: 29,  y: 24  },
  max:     { m: 59,  y: 49  },
  teams:   { m: 149, y: 124 },
};

const ANNUAL_NOTES: Record<PlanKey, string> = {
  pro:     "Billed $120/year",
  proplus: "Billed $288/year",
  max:     "Billed $588/year",
  teams:   "Billed $1,488/year",
};

// credits per month, cost per credit
const PLAN_CREDITS: Record<PlanKey, { credits: string; costPer: string }> = {
  pro:     { credits: "500 credits/mo",    costPer: "$0.024 / credit" },
  proplus: { credits: "1,500 credits/mo",  costPer: "$0.019 / credit" },
  max:     { credits: "4,000 credits/mo",  costPer: "$0.015 / credit" },
  teams:   { credits: "12,000 credits/mo", costPer: "$0.012 / credit" },
};

const PAID_PLANS: { key: PlanKey; name: string; desc: string; primary?: boolean }[] = [
  { key: "pro",     name: "PrepAI Pro",    desc: "For individual job seekers",   primary: true },
  { key: "proplus", name: "PrepAI Pro+",   desc: "For active job hunters" },
  { key: "max",     name: "PrepAI Max",    desc: "For advanced preparation" },
  { key: "teams",   name: "PrepAI Teams",  desc: "For bootcamps & universities" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      <path d="M5 8l2 2 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2l1.8 3.6L14 6.3l-3 2.9.7 4.1L8 11.3l-3.7 1.9.7-4.1L2 6.3l4.2-.7L8 2z"
        stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7.5 5v3M7.5 10h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
      <path d="M6 6.5a2 2 0 113 1.7c-.5.3-.8.8-.8 1.3v.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.6" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 3h9M5 3V2h3v1M4 3v7a1 1 0 001 1h3a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// ─── Shimmer button ───────────────────────────────────────────────────────────
function UpgradeBtn({ primary }: { primary?: boolean }) {
  const [label, setLabel] = useState("Upgrade");

  const handleClick = () => {
    setLabel("Starting...");
    setTimeout(() => setLabel("Upgrade"), 1800);
  };

  return (
    <button onClick={handleClick} style={{
      background: primary ? "#fff" : "rgba(255,255,255,0.1)",
      border: primary ? "none" : "0.5px solid rgba(255,255,255,0.13)",
      color: primary ? "#000" : "#fff",
      fontFamily: "var(--font-dm-sans), sans-serif",
      fontSize: 13,
      fontWeight: 600,
      padding: "10px 22px",
      borderRadius: 10,
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
      position: "relative" as const,
      overflow: "hidden" as const,
      transition: "opacity 0.2s",
      opacity: label === "Starting..." ? 0.7 : 1,
    }}>
      {label}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { data: session } = useSession();
  const isLoggedIn  = Boolean(session?.user);
  const credits     = session?.user?.credits ?? 100;
  const userName    = session?.user?.name?.trim() || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const [yearly, setYearly] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const price = (key: PlanKey) => yearly ? PRICES[key].y : PRICES[key].m;
  const note  = (key: PlanKey) => yearly ? ANNUAL_NOTES[key] : "\u00A0";

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete account.");
      // Sign out and redirect to home after deletion
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong.");
      setDeleting(false);
    }
  };

  return (
    <>
      {/* ── Noise + Grid ── */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E\")",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px)",
        backgroundSize: "36px 36px", pointerEvents: "none", zIndex: 0,
        maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%,black 20%,transparent 100%)",
      }} />
      {/* Glows */}
      {[
        { top: "-180px", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px" },
        { top: "30%", left: "-180px", width: "500px", height: "500px" },
        { bottom: "20%", right: "-180px", width: "500px", height: "500px" },
      ].map((s, i) => (
        <div key={i} style={{
          position: "fixed", pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse,rgba(255,255,255,0.025) 0%,transparent 65%)",
          ...s,
        }} />
      ))}

      {/* ── Nav — same as landing page ── */}
      <nav>
        <Link href="/" className="nav-logo">
          prep<span>/</span>ai
        </Link>
        <div className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#roles">Roles</Link>
          <Link href="/#reviews">Reviews</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="nav-cta">
          {isLoggedIn ? (
            <div className="auth-user-wrap">
              <div className="credits-pill">
                <span className="credits-icon">$</span>
                {credits}
              </div>
              <div className="profile-menu-wrap" ref={profileMenuRef}>
                <button
                  type="button"
                  className={`account-avatar-btn ${openProfileMenu ? "open" : ""}`}
                  onClick={() => setOpenProfileMenu((prev) => !prev)}
                  aria-label="Open profile menu"
                >
                  <span className="account-avatar">{userInitial}</span>
                </button>
                <div className={`profile-dropdown ${openProfileMenu ? "open" : ""}`}>
                  <div className="profile-name">{userName}</div>
                  <button
                    type="button"
                    className="profile-logout-btn"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/signin" className="auth-btn auth-btn-signin">
                Sign In
              </Link>
              <Link href="/signup" className="auth-btn auth-btn-signup" aria-label="Sign Up">
                <span className="signup-text-track" aria-hidden="true">
                  <span>Sign Up</span>
                  <span>Get Started</span>
                </span>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Page ── */}
      <main style={{ position: "relative", zIndex: 1, paddingTop: 100, paddingBottom: 80, maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ padding: "40px 24px 36px", animation: "fadeUp 0.6s 0.1s both" }}>
          <h1 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: "#fff", marginBottom: 4 }}>
            Choose your PrepAI Plan
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>
            Flexible plans for every stage of your career journey.
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 24px", marginBottom: 28 }}>
          <span
            onClick={() => setYearly(false)}
            style={{ fontSize: 13, color: !yearly ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)", cursor: "pointer", transition: "color 0.2s" }}
          >
            Monthly
          </span>
          <div
            onClick={() => setYearly((p) => !p)}
            style={{ width: 40, height: 22, background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.13)", borderRadius: 11, cursor: "pointer", position: "relative", transition: "background 0.3s", flexShrink: 0 }}
          >
            <div style={{ position: "absolute", top: 3, left: 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "transform 0.3s", transform: yearly ? "translateX(18px)" : "none", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
          </div>
          <span
            onClick={() => setYearly(true)}
            style={{ fontSize: 13, color: yearly ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)", cursor: "pointer", transition: "color 0.2s" }}
          >
            Annual
          </span>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.22)" }}>
            Save up to 30%
          </span>
        </div>

        {/* ── FREE SECTION ── */}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", padding: "0 24px", marginBottom: 10, letterSpacing: "0.03em" }}>
          Included in all plans
        </div>

        {/* Free features banner */}
        <FeatureBanner icon={<IconCheck />} features={["AI question generation", "Basic feedback", "Sample role templates", "MCQ practice"]} />

        {/* Free plan row */}
        <PlanRow>
          <div>
            <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 15, fontWeight: 700, color: "#fff" }}>PrepAI Free</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>For light usage</div>
          </div>
          <PriceBlock amount="0" per="per month" note="\u00A0" />
          <CreditsBlock value="100" label="credits/mo" costPer="—" />
          <button style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 13, fontWeight: 500, padding: "10px 20px", borderRadius: 10, cursor: "default", whiteSpace: "nowrap" }}>
            Current plan
          </button>
        </PlanRow>

        <div style={{ height: 20 }} />

        {/* ── PAID SECTION ── */}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", padding: "0 24px", marginBottom: 10, letterSpacing: "0.03em" }}>
          Included in all paid plans
        </div>

        {/* Paid features banner */}
        <FeatureBanner icon={<IconStar />} features={["Unlimited sessions", "Audio recording", "Resume-based feedback", "STAR method coaching", "Progress analytics"]} />

        {/* Paid plan rows */}
        {PAID_PLANS.map(({ key, name, desc, primary }) => (
          <PlanRow key={key} paid>
            <div>
              <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>{desc}</div>
            </div>
            <PriceBlock amount={String(price(key))} per="per month" note={note(key)} />
            <CreditsBlock value={PLAN_CREDITS[key].credits.split(" ")[0]} label={PLAN_CREDITS[key].credits.split(" ").slice(1).join(" ")} costPer={PLAN_CREDITS[key].costPer} />
            <UpgradeBtn primary={primary} />
          </PlanRow>
        ))}

        {/* Disclaimer */}
        <div style={{ margin: "16px 24px 0", padding: "16px 18px", background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", gap: 10 }}>
          <div style={{ flexShrink: 0, marginTop: 1, color: "rgba(255,255,255,0.22)" }}><IconInfo /></div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", lineHeight: 1.6 }}>
            For any paid plan, you can cancel at any time. Prices are exclusive of applicable taxes and duties including VAT. The 7-day free trial applies to PrepAI Pro — no credit card required to start.
          </p>
        </div>

        {/* Help accordion */}
        <div style={{ margin: "24px 24px 0", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
          <button
            onClick={() => setHelpOpen((p) => !p)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "#fff" }}
          >
            <span style={{ color: "rgba(255,255,255,0.3)" }}><IconHelp /></span>
            <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Help &amp; Documentation</span>
            <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.22)" }}><IconChevron open={helpOpen} /></span>
          </button>

          <AnimatePresence initial={false}>
            {helpOpen && (
              <motion.div
                key="help-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden", borderTop: "0.5px solid rgba(255,255,255,0.07)" }}
              >
                <motion.div
                  initial={{ y: -8 }}
                  animate={{ y: 0 }}
                  exit={{ y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {([
                    { label: "Technical support", sub: null as string | null, link: "hello@prepai.io", href: "mailto:hello@prepai.io" },
                    { label: "Documentation", sub: "Guides, API reference and tutorials", link: "docs.prepai.io", href: "#" },
                    { label: "Blog & updates", sub: "News, tutorials and team updates", link: "blog.prepai.io", href: "#" },
                  ] as const).map((row, i) => (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{row.label}</div>
                        {row.sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>{row.sub}</div>}
                      </div>
                      <a href={row.href} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{row.link}</a>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
                  >
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Follow us</div>
                    <div style={{ display: "flex", gap: 16 }}>
                      {["X (Twitter)", "LinkedIn"].map((s) => (
                        <a key={s} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{s}</a>
                      ))}
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.24 }}
                  >
                    <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "0.5px solid rgba(255,80,80,0.2)", color: "rgba(255,80,80,0.5)", fontSize: 12, fontFamily: "var(--font-dm-sans), sans-serif", padding: "8px 16px", borderRadius: 8, cursor: "pointer", margin: "16px 22px" }}
                      onClick={() => setShowDeleteModal(true)}
                    >
                      <IconDelete />
                      Delete account
                    </button>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rowIn  { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => !deleting && setShowDeleteModal(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 999,
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(8px)",
              }}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: "100%", maxWidth: 420,
                  background: "rgba(10,10,14,0.98)",
                  border: "0.5px solid rgba(255,255,255,0.13)",
                  borderRadius: 20,
                  padding: "32px 28px",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                  position: "relative",
                  pointerEvents: "all",
                  margin: "0 20px",
                }}
              >
              {/* Top shine */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, borderRadius: "20px 20px 0 0", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)" }} />

              {/* Icon */}
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,60,60,0.1)", border: "0.5px solid rgba(255,60,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M3 5h16M9 5V4h4v1M5 5v13a2 2 0 002 2h8a2 2 0 002-2V5" stroke="rgba(255,80,80,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="9" y1="10" x2="9" y2="16" stroke="rgba(255,80,80,0.6)" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="13" y1="10" x2="13" y2="16" stroke="rgba(255,80,80,0.6)" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>

              <h2 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>
                Delete your account?
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 24 }}>
                This will permanently delete your account, all your practice history, sessions, and credits. This action <strong style={{ color: "rgba(255,255,255,0.65)" }}>cannot be undone</strong>.
              </p>

              {deleteError && (
                <p style={{ fontSize: 12, color: "rgba(255,90,90,0.9)", background: "rgba(255,60,60,0.06)", border: "0.5px solid rgba(255,60,60,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 18 }}>
                  ⚠ {deleteError}
                </p>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                    border: "0.5px solid rgba(255,255,255,0.13)",
                    color: "rgba(255,255,255,0.55)",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 14, fontWeight: 500, cursor: "pointer",
                    transition: "all 0.2s",
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 12,
                    background: deleting ? "rgba(200,40,40,0.6)" : "rgba(220,40,40,0.9)",
                    border: "none",
                    color: "#fff",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 14, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {deleting ? (
                    <>
                      <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      Deleting…
                    </>
                  ) : (
                    "Delete account"
                  )}
                </button>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rowIn  { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureBanner({ icon, features }: { icon: React.ReactNode; features: string[] }) {
  return (
    <div style={{
      margin: "0 24px 10px",
      background: "rgba(255,255,255,0.03)",
      border: "0.5px solid rgba(255,255,255,0.13)",
      borderRadius: 14, padding: "14px 20px",
      display: "flex", alignItems: "center", gap: 10,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.13)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0 24px" }}>
        {features.map((f) => (
          <span key={f} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 14 }}>✦</span> {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanRow({ children, paid }: { children: React.ReactNode; paid?: boolean }) {
  return (
    <div style={{
      margin: "0 24px 8px",
      background: "rgba(10,10,14,0.85)",
      border: "0.5px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "18px 22px",
      display: "grid",
      gridTemplateColumns: "1fr auto auto auto",
      alignItems: "center", gap: 20,
      position: "relative", overflow: "hidden",
      cursor: paid ? "pointer" : "default",
      transition: "border-color 0.25s, background 0.25s",
    }}
      onMouseEnter={(e) => { if (paid) { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.18)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(14,14,20,0.95)"; }}}
      onMouseLeave={(e) => { if (paid) { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(10,10,14,0.85)"; }}}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)" }} />
      {children}
    </div>
  );
}

function PriceBlock({ amount, per, note }: { amount: string; per: string; note: string }) {
  return (
    <div style={{ textAlign: "right", whiteSpace: "nowrap" as const }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 1, justifyContent: "flex-end" }}>
        <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>$</span>
        <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: "-2px", color: "#fff", lineHeight: 1 }}>{amount}</span>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>{per}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 2, minHeight: 14 }}>{note}</div>
    </div>
  );
}

function CreditsBlock({ value, label, costPer }: { value: string; label: string; costPer: string }) {
  return (
    <div style={{ whiteSpace: "nowrap" as const, textAlign: "right" as const }}>
      <div>
        <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 16, fontWeight: 700, color: "#fff" }}>{value}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}> {label}</span>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>{costPer}</div>
    </div>
  );
}
