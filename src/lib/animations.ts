import { Variants, Transition } from "framer-motion"

/**
 * Framer Motion Animation Presets
 * Warm & Earthy Design System - Delightful Micro-interactions
 */

// Easing functions
export const EASE_OUT = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const

// Standard transitions
export const transition: {
  fast: Transition
  normal: Transition
  slow: Transition
  spring: Transition
  bounce: Transition
} = {
  fast: { duration: 0.15, ease: EASE_OUT as any },
  normal: { duration: 0.25, ease: EASE_OUT as any },
  slow: { duration: 0.35, ease: EASE_OUT as any },
  spring: { type: "spring", stiffness: 400, damping: 30 },
  bounce: { type: "spring", stiffness: 300, damping: 20 },
}

// Button interactions
export const buttonHover = {
  scale: 1.02,
  y: -2,
  transition: transition.fast,
}

export const buttonTap = {
  scale: 0.98,
  transition: transition.fast,
}

// Card interactions
export const cardHover = {
  y: -4,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
  transition: transition.normal,
}

// List item stagger animation
export const listContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transition.normal,
  },
}

// Fade animations
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transition.normal },
  exit: { opacity: 0, transition: transition.fast },
}

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: transition.normal },
  exit: { opacity: 0, y: -20, transition: transition.fast },
}

// Slide animations
export const slideInFromBottom: Variants = {
  initial: { y: "100%", opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { ...transition.spring, stiffness: 350 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: transition.normal,
  },
}

export const slideInFromRight: Variants = {
  initial: { x: "100%", opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: transition.normal,
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: transition.fast,
  },
}

// Modal/Dialog animations
export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transition.fast },
  exit: { opacity: 0, transition: transition.fast },
}

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...transition.normal, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: transition.fast,
  },
}

// Shopping list checkbox animation
export const checkboxCheck: Variants = {
  unchecked: { scale: 0, opacity: 0 },
  checked: {
    scale: 1,
    opacity: 1,
    transition: transition.bounce,
  },
}

// Strikethrough animation
export const strikethrough: Variants = {
  initial: { width: "0%" },
  animate: {
    width: "100%",
    transition: { ...transition.normal, delay: 0.1 },
  },
}

// Success feedback (brief celebration)
export const successPulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.4, times: [0, 0.5, 1] },
  },
}

// Number count-up animation
export const countUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: transition.normal },
}

// Hover lift effect (for interactive cards)
export const hoverLift = {
  rest: { y: 0 },
  hover: { y: -4, transition: transition.fast },
}

// Collapse/Expand animations
export const collapse: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: "hidden" },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: transition.normal,
  },
}

// Page transition variants
export const pageTransition: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: transition.normal,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: transition.fast,
  },
}

// Rotate/spin animation (for loading states)
export const rotate360: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
}

// Pulse animation (for loading dots)
export const pulse: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.1, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

/**
 * Helper: Stagger children with custom delay
 */
export const staggerContainer = (staggerDelay = 0.05): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
    },
  },
})

/**
 * Helper: Create a spring animation with custom config
 */
export const createSpring = (stiffness = 300, damping = 25): Transition => ({
  type: "spring",
  stiffness,
  damping,
})

/**
 * Respect prefers-reduced-motion
 * Wrap animations with this to disable for users who prefer reduced motion
 */
export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const safeAnimate = <T extends object>(animation: T): T | {} =>
  prefersReducedMotion ? {} : animation
