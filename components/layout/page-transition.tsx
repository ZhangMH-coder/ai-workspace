"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/** 页面切换过渡：淡入 + 轻微上移，尊重系统减弱动效偏好 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
