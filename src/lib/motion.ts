import type { Transition, Variants } from 'framer-motion';

export const pageTransition: Transition = {
  duration: 0.24,
  ease: [0.4, 0, 0.2, 1]
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 }
};

export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 }
};

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 }
  }
};

export const messageVariants: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
  }
};

export const collapseVariants: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 }
};
