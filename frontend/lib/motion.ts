import type { Transition, Variants } from "framer-motion";

/** Shared motion primitives. Components should compose these rather than inventing timings. */
export const motion = {
  duration: {
    fast: 0.12,
    normal: 0.2,
    slow: 0.36,
  },
  easing: {
    standard: [0.2, 0, 0, 1],
    enter: [0.16, 1, 0.3, 1],
  },
  spring: {
    type: "spring",
    stiffness: 320,
    damping: 28,
    mass: 0.8,
  } satisfies Transition,
} as const;

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: motion.duration.normal } },
  exit: { opacity: 0, transition: { duration: motion.duration.fast } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { ...motion.spring } },
  exit: { opacity: 0, y: 8, transition: { duration: motion.duration.fast } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { ...motion.spring } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: motion.duration.fast } },
};

export const pulse: Variants = {
  idle: { opacity: 1 },
  active: {
    opacity: [0.55, 1],
    transition: { duration: 0.9, repeat: Infinity, repeatType: "reverse" },
  },
};

export const loading: Variants = {
  hidden: { opacity: 0, rotate: 0 },
  visible: {
    opacity: 1,
    rotate: 360,
    transition: { duration: motion.duration.slow, repeat: Infinity, ease: "linear" },
  },
};

export const thinking: Variants = {
  idle: { opacity: 0.55 },
  active: {
    opacity: 1,
    transition: { duration: 0.9, repeat: Infinity, repeatType: "reverse" },
  },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { ...motion.spring } },
  exit: { opacity: 0, y: -4, transition: { duration: motion.duration.fast } },
};

/** Reserved for future organization-formation feedback without coupling to a product flow. */
export const organizationGeneration: Variants = {
  idle: { opacity: 0.55, scale: 1 },
  thinking: {
    opacity: 1,
    scale: 1.02,
    transition: { repeat: Infinity, repeatType: "reverse", duration: 0.9 },
  },
  complete: { opacity: 1, scale: 1, transition: { ...motion.spring } },
};
