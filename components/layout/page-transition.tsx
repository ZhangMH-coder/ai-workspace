"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/** 页面切换过渡：淡入 + 轻微上移；系统开启减弱动效时直接显示，不做位移 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
