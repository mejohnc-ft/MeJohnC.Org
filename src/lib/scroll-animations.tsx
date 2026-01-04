/* eslint-disable react-refresh/only-export-components */
import React, { ReactNode } from 'react';
import { motion, Variants, HTMLMotionProps } from 'framer-motion';
import { useReducedMotion } from './reduced-motion';

// Reduced motion variants (instant transitions)
const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// Common animation variants
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0 },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

export const slideInLeft: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0 },
};

export const slideInRight: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0 },
};

interface ScrollAnimationProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  variants?: Variants;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number | 'some' | 'all';
  className?: string;
}

/**
 * Scroll-triggered animation wrapper
 * Animates children when they enter the viewport
 */
export function ScrollAnimation({
  children,
  variants = fadeInUp,
  delay = 0,
  duration = 0.5,
  once = true,
  amount = 0.3,
  className,
  ...props
}: ScrollAnimationProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={prefersReducedMotion ? reducedMotionVariants : variants}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  staggerDelay?: number;
  once?: boolean;
  amount?: number | 'some' | 'all';
  className?: string;
}

/**
 * Container for staggered child animations
 */
export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  once = true,
  amount = 0.2,
  className,
  ...props
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={containerVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  variants?: Variants;
  className?: string;
}

/**
 * Child item for staggered animations
 * Must be used inside StaggerContainer
 */
export function StaggerItem({
  children,
  variants = fadeInUp,
  className,
  ...props
}: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? reducedMotionVariants : variants}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface ParallaxProps extends Omit<HTMLMotionProps<'div'>, 'style'> {
  children: ReactNode;
  speed?: number;
  offset?: number;
  className?: string;
}

/**
 * Parallax effect on scroll using CSS transforms
 * speed: 0.5 = moves at half scroll speed (slower/subtle)
 * speed: 1.5 = moves at 1.5x scroll speed (faster/more dramatic)
 * offset: initial Y offset in pixels
 */
export function Parallax({
  children,
  speed = 0.5,
  offset = 0,
  className,
  ...props
}: ParallaxProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = React.useState(0);

  React.useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // Calculate how far element is from center of viewport
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = windowHeight / 2;
        const distanceFromCenter = elementCenter - viewportCenter;
        setScrollY(distanceFromCenter * (speed - 1));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion, speed]);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{
        transform: `translateY(${offset + scrollY}px)`,
        willChange: 'transform',
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface RevealOnScrollProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  className?: string;
}

/**
 * Reveal element with direction when scrolling into view
 */
export function RevealOnScroll({
  children,
  direction = 'up',
  delay = 0,
  className,
  ...props
}: RevealOnScrollProps) {
  const prefersReducedMotion = useReducedMotion();

  const directionVariants: Record<string, Variants> = {
    up: fadeInUp,
    down: fadeInDown,
    left: fadeInLeft,
    right: fadeInRight,
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={prefersReducedMotion ? reducedMotionVariants : directionVariants[direction]}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.6,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hook to create scroll-linked animations
 * Returns scroll progress (0-1) for the page
 */
export function useScrollProgress() {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(Math.min(1, Math.max(0, scrollProgress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}
