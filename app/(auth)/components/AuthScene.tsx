"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type AuthMode = "signin" | "signup";
type AuthSceneProps = { mode: AuthMode };

const pageStyle: CSSProperties = { minHeight: "100svh", background: "#060608", color: "#fff", position: "relative", overflow: "hidden" };
const noiseStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
  pointerEvents: "none",
  zIndex: 0,
};
const glowTl: CSSProperties = { position: "fixed", top: "-180px", left: "-180px", width: "600px", height: "600px", background: "radial-gradient(ellipse,rgba(255,255,255,0.04) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 };
const glowBr: CSSProperties = { position: "fixed", bottom: "-180px", right: "-180px", width: "600px", height: "600px", background: "radial-gradient(ellipse,rgba(255,255,255,0.03) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 };
const glowCenter: CSSProperties = { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "800px", height: "500px", background: "radial-gradient(ellipse,rgba(255,255,255,0.025) 0%,transparent 60%)", pointerEvents: "none", zIndex: 0 };
const dotGrid: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)",
  backgroundSize: "36px 36px",
  pointerEvents: "none",
  zIndex: 0,
  maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)",
};

const navStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  padding: "0 48px",
  height: "64px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "rgba(6,6,8,0.7)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderBottom: "0.5px solid rgba(255,255,255,0.07)",
};
const navLogoStyle: CSSProperties = { fontFamily: "var(--font-syne), sans-serif", fontSize: "17px", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", textDecoration: "none" };
const navSwitchStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "rgba(255,255,255,0.55)" };
const navSwitchLinkStyle: CSSProperties = { color: "#fff", textDecoration: "none", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "1px" };

const layoutStyle: CSSProperties = { position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px 40px" };
const panelWrapStyle: CSSProperties = { width: "100%", maxWidth: "480px" };
const panelStyle: CSSProperties = { background: "rgba(10,10,14,0.85)", border: "0.5px solid rgba(255,255,255,0.13)", borderRadius: "28px", padding: "44px", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", position: "relative", overflow: "hidden" };
const panelTopShine: CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)" };
const panelOverlay: CSSProperties = { position: "absolute", inset: 0, borderRadius: "28px", background: "linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 50%)", pointerEvents: "none" };

const panelHeaderStyle: CSSProperties = { marginBottom: "32px", textAlign: "center", position: "relative", zIndex: 1 };
const eyebrowStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.55)", fontSize: "11px", letterSpacing: "0.05em", padding: "5px 14px", borderRadius: "20px", marginBottom: "20px" };
const liveDotStyle: CSSProperties = { width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.6)" };
const titleStyle: CSSProperties = { fontFamily: "var(--font-syne), sans-serif", fontSize: "30px", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: "8px" };
const subtitleStyle: CSSProperties = { fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 };

const formBaseStyle: CSSProperties = { position: "relative", zIndex: 1 };
const googleBtnStyle: CSSProperties = { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "11px", background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.13)", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "14px", fontWeight: 500, padding: "13px 20px", borderRadius: "12px", cursor: "pointer", marginBottom: "24px" };
const googleIconStyle: CSSProperties = { width: "20px", height: "20px", flexShrink: 0 };

const dividerStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" };
const dividerLine: CSSProperties = { flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" };
const dividerText: CSSProperties = { fontSize: "12px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em", whiteSpace: "nowrap" };

const formRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" };
const fieldStyle: CSSProperties = { marginBottom: "14px" };
const labelStyle: CSSProperties = { display: "block", fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "7px", letterSpacing: "0.02em", fontWeight: 500 };
const inputStyle: CSSProperties = { width: "100%", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.13)", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", fontFamily: "var(--font-dm-sans), sans-serif", color: "#fff", outline: "none" };

const forgotRowStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" };
const forgotLinkStyle: CSSProperties = { fontSize: "12px", color: "rgba(255,255,255,0.22)", textDecoration: "none" };
const pwWrapStyle: CSSProperties = { position: "relative" };
const pwToggleStyle: CSSProperties = { position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.22)", padding: "4px", display: "flex", alignItems: "center", cursor: "pointer" };

const primaryBtnStyle: CSSProperties = { width: "100%", background: "#fff", color: "#000", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "14px", fontWeight: 600, padding: "13px 20px", borderRadius: "12px", border: "none", cursor: "pointer", marginTop: "4px", letterSpacing: "0.01em" };
const termsStyle: CSSProperties = { fontSize: "11px", color: "rgba(255,255,255,0.22)", textAlign: "center", marginTop: "16px", lineHeight: 1.6 };
const termsLinkStyle: CSSProperties = { color: "rgba(255,255,255,0.55)", textDecoration: "none" };
const switchFooterStyle: CSSProperties = { textAlign: "center", marginTop: "24px", paddingTop: "24px", borderTop: "0.5px solid rgba(255,255,255,0.07)", fontSize: "13px", color: "rgba(255,255,255,0.22)" };
const switchLinkStyle: CSSProperties = { color: "rgba(255,255,255,0.7)", textDecoration: "none", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "1px" };

export default function AuthScene({ mode }: AuthSceneProps) {
  const isSignUp = mode === "signup";

  return (
    <div style={pageStyle}>
      <div style={noiseStyle} />
      <div style={glowTl} />
      <div style={glowBr} />
      <div style={glowCenter} />
      <div style={dotGrid} />

      <nav style={navStyle}>
        <Link href="/" style={navLogoStyle}>
          prep<span style={{ color: "rgba(255,255,255,0.22)" }}>/</span>ai
        </Link>
        <div style={navSwitchStyle}>
          {isSignUp ? "Already have an account?" : "New here?"}{" "}
          <Link href={isSignUp ? "/signin" : "/signup"} style={navSwitchLinkStyle}>
            {isSignUp ? "Sign in" : "Create account"}
          </Link>
        </div>
      </nav>

      <main style={layoutStyle}>
        <div style={panelWrapStyle}>
          <motion.section
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={panelStyle}
          >
            <div style={panelTopShine} />
            <div style={panelOverlay} />

            <div style={panelHeaderStyle}>
              <div style={eyebrowStyle}>
                <span style={liveDotStyle} />
                {isSignUp ? "Join 50,000+ job seekers" : "Welcome back"}
              </div>
              <h1 style={titleStyle}>
                {isSignUp ? "Create your" : "Sign in to"}
                <br />
                <em style={{ fontStyle: "normal", color: "rgba(255,255,255,0.22)" }}>
                  {isSignUp ? "free account." : "prep.ai"}
                </em>
              </h1>
              <p style={subtitleStyle}>
                {isSignUp ? "Start practicing interviews and land your dream role." : "Continue your interview practice journey."}
              </p>
            </div>

            <div style={formBaseStyle}>
              <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} style={googleBtnStyle}>
                <svg style={googleIconStyle} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </motion.button>

              <div style={dividerStyle}>
                <div style={dividerLine} />
                <span style={dividerText}>or {isSignUp ? "sign up" : "sign in"} with email</span>
                <div style={dividerLine} />
              </div>

              {isSignUp ? (
                <div style={formRowStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>First name</label>
                    <input style={inputStyle} type="text" placeholder="Alex" />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Last name</label>
                    <input style={inputStyle} type="text" placeholder="Morgan" />
                  </div>
                </div>
              ) : null}

              <div style={fieldStyle}>
                <label style={labelStyle}>Email address</label>
                <input style={inputStyle} type="email" placeholder="alex@example.com" />
              </div>

              <div style={fieldStyle}>
                {isSignUp ? (
                  <label style={labelStyle}>Password</label>
                ) : (
                  <div style={forgotRowStyle}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                    <a href="#" style={forgotLinkStyle}>
                      Forgot password?
                    </a>
                  </div>
                )}
                <div style={pwWrapStyle}>
                  <input style={{ ...inputStyle, paddingRight: "44px" }} type="password" placeholder={isSignUp ? "Create a strong password" : "Enter your password"} />
                  <button type="button" style={pwToggleStyle} aria-label="Toggle password visibility">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </button>
                </div>
              </div>

              <motion.button whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.99 }} style={primaryBtnStyle}>
                {isSignUp ? "Create account  \u2192" : "Sign in  \u2192"}
              </motion.button>

              {isSignUp ? (
                <div style={termsStyle}>
                  By creating an account you agree to our <a href="#" style={termsLinkStyle}>Terms of Service</a> and{" "}
                  <a href="#" style={termsLinkStyle}>Privacy Policy</a>
                </div>
              ) : null}

              <div style={switchFooterStyle}>
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <Link href={isSignUp ? "/signin" : "/signup"} style={switchLinkStyle}>
                  {isSignUp ? "Sign in \u2192" : "Create one free \u2192"}
                </Link>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

