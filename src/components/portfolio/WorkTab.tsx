import { motion } from "framer-motion";
import CareerDepth from "@/components/portfolio/CareerDepth";
import CareerOverview from "@/components/portfolio/CareerOverview";
import { useReducedMotion } from "@/lib/reduced-motion";

export default function WorkTab() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key="work"
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
    >
      <CareerOverview />
      <CareerDepth />
    </motion.div>
  );
}
