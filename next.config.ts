import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/sign-in", destination: "/signin", permanent: false },
      { source: "/sign-up", destination: "/signup", permanent: false },
      { source: "/interviewstart", destination: "/interview-start", permanent: false },
      { source: "/interview_start", destination: "/interview-start", permanent: false },
      { source: "/interview-practice-coding", destination: "/interview-practice/coding", permanent: false },
      { source: "/interview-practice-mcq", destination: "/interview-practice/mcq", permanent: false },
      { source: "/interview-practice-voice", destination: "/interview-practice/voice", permanent: false },
      { source: "/interview-practice-voic", destination: "/interview-practice/voice", permanent: false },
    ];
  },
};

export default nextConfig;
