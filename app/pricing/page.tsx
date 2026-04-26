"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5l2.5 2.5L8 3" stroke="rgba(255,255,255,0.6)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const proPrice = yearly ? "13" : "19";
  const proAnnualText = yearly ? "Billed $156/year" : "\u00A0";

  return (
    <>
      <div className="glow-1" />
      <div className="glow-2" />

      <nav>
        <Link href="/" className="nav-logo">
          prep<span>/</span>ai
        </Link>
        <div className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#roles">Roles</Link>
          <Link href="/#reviews">Reviews</Link>
          <Link href="/#faq">FAQ</Link>
          
        </div>
        <div className="nav-cta">
          {/* <button className="btn-ghost-sm pricing-active">Pricing</button> */}
          <Link href="/signin" className="auth-btn auth-btn-signin">
            Sign In
          </Link>
          <Link href="/signup" className="auth-btn auth-btn-signup" aria-label="Sign Up">
            <span className="signup-text-track" aria-hidden="true">
              <span>Sign Up</span>
              <span>Get Started</span>
            </span>
          </Link>
        </div>
      </nav>

      <main className="pricing-page">
        <motion.div className="toggle-wrap" variants={fadeUp} initial="hidden" animate="show">
          <span className={`toggle-label ${!yearly ? "active" : ""}`}>Monthly</span>
          <button
            className={`toggle-switch ${yearly ? "yearly" : ""}`}
            aria-label="Toggle billing cycle"
            onClick={() => setYearly((prev) => !prev)}
          >
            <span className="toggle-thumb" />
          </button>
          <span className={`toggle-label ${yearly ? "active" : ""}`}>Annually</span>
          <span className="save-badge">Save 30%</span>
        </motion.div>

        <div className="cards-grid">
          <motion.div className="pcard" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
            <div className="plan-name">Starter</div>
            <div className="plan-price">
              <span className="price-currency">$</span>
              <span className="price-amount">0</span>
              <span className="price-period">/mo</span>
            </div>
            <div className="price-annual">&nbsp;</div>
            <p className="plan-desc">
              Everything you need to start practicing and building confidence before your next interview.
            </p>
            <button className="plan-btn ghost">Get started free</button>
            <div className="features-label">What&apos;s included</div>
            <ul className="feature-list">
              {[
                "5 interview sessions per month",
                "AI-generated questions",
                "Text answer input",
                "Basic AI feedback",
                "Sample role templates",
              ].map((text) => (
                <li key={text}>
                  <span className="check on">
                    <CheckIcon />
                  </span>
                  {text}
                </li>
              ))}
              {["Audio recording", "Resume-based feedback", "Progress analytics"].map((text) => (
                <li key={text} className="dim">
                  <span className="cross">
                    <CrossIcon />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="pcard featured"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.2 }}
          >
            <div className="popular-badge">Most popular</div>
            <div className="plan-name">Pro</div>
            <div className="plan-price">
              <span className="price-currency">$</span>
              <span className="price-amount">{proPrice}</span>
              <span className="price-period">/mo</span>
            </div>
            <div className="price-annual">{proAnnualText}</div>
            <p className="plan-desc">
              The full interview coaching experience — unlimited practice, audio, and deep AI coaching powered by your
              resume.
            </p>
            <button className="btn-primary pricing-pro-btn ">Start Pro free trial &nbsp;-&gt;</button>
            <div className="features-label">Everything in Starter, plus</div>
            <ul className="feature-list">
              {[
                "Unlimited interview sessions",
                "Audio recording & transcription",
                "Resume-based deep feedback",
                "STAR method coaching",
                "Score analytics & history",
                "Custom job description input",
                "Sample answer library",
              ].map((text) => (
                <li key={text}>
                  <span className="check on">
                    <CheckIcon />
                  </span>
                  {text}
                </li>
              ))}
              <li className="dim">
                <span className="cross">
                  <CrossIcon />
                </span>
                Team seats & management
              </li>
            </ul>
          </motion.div>

          <motion.div className="pcard" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.3 }}>
            <div className="plan-name">Enterprise</div>
            <div className="plan-price">
              <span className="price-amount custom-price">Custom</span>
            </div>
            <div className="price-annual">&nbsp;</div>
            <p className="plan-desc">
              Built for universities, bootcamps, and hiring teams. White-label, SSO, custom roles, and dedicated
              support.
            </p>
            <button className="plan-btn outline">Contact sales →</button>
            <div className="features-label">Everything in Pro, plus</div>
            <ul className="feature-list">
              {[
                "Unlimited team seats",
                "Admin dashboard & analytics",
                "SSO / SAML integration",
                "White-label branding",
                "Custom question banks",
                "Priority email & Slack support",
                "Dedicated onboarding",
                "SLA & data compliance",
              ].map((text) => (
                <li key={text}>
                  <span className="check on">
                    <CheckIcon />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="section-divider" />

        <motion.div className="compare-wrap" variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.4 }}>
          <div className="compare-eyebrow">
            <h2>Full plan comparison</h2>
            <p>See exactly what&apos;s included in each plan.</p>
          </div>
          <table className="compare-table">
            <thead>
              <tr>
                <th />
                <th>Starter</th>
                <th className="highlight-col">Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="section-row">
                  Practice
                </td>
              </tr>
              <tr>
                <td>Interview sessions</td>
                <td>5 / month</td>
                <td className="highlight-col">Unlimited</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Question types</td>
                <td>Behavioral</td>
                <td className="highlight-col">Behavioral + Technical</td>
                <td>Behavioral + Technical</td>
              </tr>
              <tr>
                <td>Audio recording</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="tick">✓</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td>Custom job description</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="tick">✓</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="section-row">
                  AI Coaching
                </td>
              </tr>
              <tr>
                <td>Basic feedback</td>
                <td>
                  <span className="tick">✓</span>
                </td>
                <td className="highlight-col">
                  <span className="tick">✓</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td>STAR method coaching</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="tick">✓</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td>Resume-based feedback</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="tick">✓</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td>Progress analytics</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="tick">✓</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="section-row">
                  Team &amp; Enterprise
                </td>
              </tr>
              <tr>
                <td>Team seats</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="dash">—</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td>Admin dashboard</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="dash">—</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td>SSO / SAML</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="dash">—</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td>White-label</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">
                  <span className="dash">—</span>
                </td>
                <td>
                  <span className="tick">✓</span>
                </td>
              </tr>
              <tr>
                <td>Priority support</td>
                <td>
                  <span className="dash">—</span>
                </td>
                <td className="highlight-col">Email</td>
                <td>Email + Slack + SLA</td>
              </tr>
            </tbody>
          </table>
        </motion.div>
      </main>
    </>
  );
}
