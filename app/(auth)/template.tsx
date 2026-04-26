"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type AuthTemplateProps = {
  children: ReactNode;
};

export default function AuthTemplate({ children }: AuthTemplateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

