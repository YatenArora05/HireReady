"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const faqItems = [
  {
    q: "Why did you make this site?",
    a: "We built prep.ai to democratize interview preparation. Everyone deserves access to high-quality coaching, not just those who can afford expensive coaches or have the right connections.",
  },
  {
    q: "How accurate are the AI interview questions and feedback?",
    a: "Our AI is trained on thousands of real interview transcripts and uses the latest models to generate highly relevant, role-specific questions. Feedback is structured around proven frameworks like the STAR method.",
  },
  {
    q: "Can I use this for any job role?",
    a: "Yes! You can paste any job description and our AI will tailor questions specifically to that role. We also provide preset templates for the most common roles.",
  },
  {
    q: "How is this different from using ChatGPT?",
    a: "Unlike a generic chatbot, prep.ai is purpose-built for interview prep - with timed sessions, audio recording, structured scoring, sample responses, and a curated question bank. Everything is designed around the interview workflow.",
  },
  {
    q: "Is it free to use?",
    a: "Yes, our core features are completely free. We offer a Pro plan with additional features like resume-based feedback, unlimited sessions, and advanced analytics.",
  },
  {
    q: "Do you store my audio files?",
    a: "No. Your audio is processed in real-time for transcription and immediately discarded. We never store your audio recordings. Your data remains private.",
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div className="glow-1" />
      <div className="glow-2" />

      <nav>
        <a href="#" className="nav-logo">
          prep<span>/</span>ai
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#roles">Roles</a>
          <a href="#reviews">Reviews</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-cta">
          <Link href="/pricing" className="btn-ghost-sm">
            Pricing
          </Link>
          <button className="btn-white-sm">Sign in with Google</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-main w-screen">
          <div className="hero-eyebrow">
            <span className="live-dot" />
            #1 AI Interview Prep Platform
          </div>
          <h1>
            <span>Boost your confidence,</span>
            <em>ace the job interview.</em>
          </h1>
          <p className="hero-sub">
            Practice with questions tailored to your job description. Get instant
            AI feedback and suggestions to sharpen every answer.
          </p>
          <div className="hero-btns">
            <button className="btn-primary">Try now for free &nbsp;-&gt;</button>
            <button className="btn-outline">Watch demo</button>
          </div>
          <p className="hero-note">No credit card needed</p>
        </div>

        <div className="hero-screen-wrap">
          <div className="hero-screen">
            <div className="screen-bar">
              <div className="dot" style={{ background: "#333" }} />
              <div className="dot" style={{ background: "#222" }} />
              <div className="dot" style={{ background: "#1a1a1a" }} />
              <span className="screen-title">Live interview session</span>
              <span className="screen-round">
                <span className="screen-round-dot" />
                Round 1 · Technical
              </span>
            </div>
            <div className="screen-content">
              <div className="sc-left">
                <div className="sc-label">Current question</div>
                <div className="sc-question">
                  &quot;In situations where your marketing campaign did not
                  achieve the expected results, how do you analyze its
                  performance and pivot your approach?&quot;
                </div>
                <div className="sc-timer">0:00 / 3:00</div>
                <div className="mic-btn">🎙</div>
              </div>
              <div className="sc-right">
                {[
                  ["Clarity", "8.2", 82],
                  ["Structure", "7.5", 75],
                  ["Relevance", "9.1", 91],
                ].map(([name, score, width]) => (
                  <div className="score-card" key={name}>
                    <div className="sc-name">{name}</div>
                    <div className="sc-score-row">
                      <span className="sc-score-val">{score}</span>
                      <span className="sc-of">/ 10</span>
                    </div>
                    <div className="sc-bar">
                      <div
                        className="sc-fill"
                        style={{ width: `${width as number}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="score-card score-overall">
                  <div className="sc-name">Overall</div>
                  <div className="sc-score-row">
                    <span className="sc-score-val sc-overall-val">8.6</span>
                    <span className="sc-of">/ 10</span>
                  </div>
                  <div className="sc-bar">
                    <div className="sc-fill" style={{ width: "86%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="trusted">
        <span className="trusted-text">Trusted by</span>
        <div className="avatar-row">
          <div className="av">HT</div>
          <div className="av">JJ</div>
          <div className="av">CB</div>
          <div className="av">MK</div>
          <div className="av">+</div>
        </div>
        <div className="stars">★★★★★</div>
        <span className="trusted-stat">50,000+ job seekers</span>
      </div>

      <section className="section-pad" id="how">
        <div className="centered-header">
          <span className="section-eyebrow">How it works</span>
          <h2 className="section-title">
            Give yourself an unfair
            <br />
            advantage in interviews
          </h2>
          <p className="section-sub center-text">
            Would not it be nice to know which questions recruiters will ask -
            and exactly how to answer them - before you walk in?
          </p>
        </div>

        <div className="hiw-step reveal step-first">
          <div>
            <div className="step-num">01</div>
            <h3 className="step-title">Generate questions</h3>
            <p className="step-desc">
              Paste a job description and receive realistic interview questions
              tailored to the role - both behavioral and technical.
            </p>
          </div>
          <div className="step-mock">
            <div className="mock-header">
              <span className="mock-header-title">Question generation</span>
              <span className="meta-text">5000 chars left</span>
            </div>
            <div className="mock-body">
              <textarea
                className="mock-textarea"
                readOnly
                placeholder="Select a job role above or paste your own description here..."
              />
              <div className="mock-btn-wrap">
                <button className="mock-btn">Generate Questions -&gt;</button>
              </div>
            </div>
          </div>
        </div>

        <div className="hiw-step reverse reveal">
          <div>
            <div className="step-num">02</div>
            <h3 className="step-title">Practice answering</h3>
            <p className="step-desc">
              Record your answer via audio or text, simulating the real
              interview experience under timed pressure.
            </p>
          </div>
          <div className="step-mock">
            <div className="mock-header">
              <span className="mock-header-title">Question 1 of 8</span>
            </div>
            <div className="mock-body">
              <div className="q-box">
                <div className="q-text">
                  &quot;Can you provide an example of a challenging software
                  development project you worked on and how you successfully
                  overcame obstacles?&quot;
                </div>
              </div>
              <div className="timer-lg">0:00 / 2:00</div>
            </div>
          </div>
        </div>

        <div className="hiw-step reveal">
          <div>
            <div className="step-num">03</div>
            <h3 className="step-title">Improve with AI coaching</h3>
            <p className="step-desc">
              Get instant AI feedback with an improved sample response showing
              exactly how you could have answered the question better.
            </p>
          </div>
          <div className="step-mock">
            <div className="mock-header">
              <span className="mock-header-title">AI Feedback</span>
            </div>
            <div className="mock-body">
              <div className="feedback-box">
                <div className="fb-title">Feedback</div>
                <div className="fb-text">
                  You did a great job illustrating a challenging project. One
                  suggestion: briefly mention technologies you used to add
                  technical depth.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="roles-section" id="roles">
        <span className="section-eyebrow">Quick start</span>
        <h2 className="section-title">
          Works for every type of
          <br />
          job interview and role
        </h2>
        <p className="section-sub center-text">
          Provide your own job description or choose from our sample roles.
        </p>
        <div className="roles-grid">
          {[
            "My Job Description",
            "Business Analyst",
            "Product Manager",
            "Software Engineer",
            "Marketing Specialist",
            "Data Analyst",
            "Customer Service Rep",
            "Sales Representative",
            "UX / UI Designer",
          ].map((role) => (
            <div className="role-item reveal" key={role}>
              <span className="role-name">{role}</span>
              <span className="role-arrow">→</span>
            </div>
          ))}
        </div>
      </section>

      <section className="testi-section" id="reviews">
        <div className="centered-header">
          <span className="section-eyebrow">Success stories</span>
          <h2 className="section-title">
            Helped 50,000+ job seekers
            <br />
            land their dream roles
          </h2>
          <p className="section-sub center-text">
            You are one mock interview away from your dream job.
          </p>
        </div>
        <div className="testi-grid">
          {[
            {
              initials: "HT",
              name: "Henry Tran",
              role: "Marketing Operations",
              quote:
                "I used your product for an interview I had yesterday, and sure enough one of the generated questions came up. Absolutely invaluable.",
            },
            {
              initials: "JJ",
              name: "Jenny Jiang",
              role: "Software Engineer",
              quote:
                "Great tool for anyone preparing for an interview in tech. Helped me ace my interviews! The feedback is specific and actionable.",
            },
            {
              initials: "CB",
              name: "Charles Burr",
              role: "UX Designer",
              quote:
                "Love prep.ai - it has been helping me so much prepping for a big interview tomorrow! The AI coaching is genuinely impressive.",
            },
          ].map((item) => (
            <div className="testi-card reveal" key={item.name}>
              <div className="testi-avatar">{item.initials}</div>
              <div className="testi-name">{item.name}</div>
              <div className="testi-role">{item.role}</div>
              <div className="testi-stars">★★★★★</div>
              <div className="testi-quote">&quot;{item.quote}&quot;</div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-inner">
          <h2>
            Ready to master your
            <br />
            interview skills?
          </h2>
          <p>Start practicing in seconds. No credit card required.</p>
          <button className="btn-primary">Try now for free &nbsp;-&gt;</button>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="centered-header faq-head">
          <span className="section-eyebrow">FAQ</span>
          <h2 className="section-title">Frequently asked questions</h2>
          <p className="section-sub center-text">How can we help you?</p>
        </div>
        <div className="faq-inner">
          {faqItems.map((item, idx) => {
            const open = openFaq === idx;
            return (
              <div className="faq-item" key={item.q}>
                <button
                  className={`faq-q ${open ? "open" : ""}`}
                  onClick={() => setOpenFaq(open ? null : idx)}
                >
                  {item.q} <span>+</span>
                </button>
                <div className={`faq-a ${open ? "open" : ""}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer>
        <div className="footer-logo">
          prep<span>/</span>ai
        </div>
        <div className="footer-right">
          Questions? Email <a href="mailto:hello@prepai.io">hello@prepai.io</a>
        </div>
      </footer>
    </>
  );
}
