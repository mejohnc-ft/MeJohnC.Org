import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/PageTransition";
import {
  useSEO,
  useJsonLd,
  personSchema,
  websiteSchema,
  occupationSchema,
  RECRUITING_KEYWORDS,
} from "@/lib/seo";
import { useSupabaseClient } from "@/lib/supabase";
import { getSiteContent } from "@/lib/supabase-queries";
import { captureException } from "@/lib/sentry";
import { toError } from "@/lib/errors";
import { useReducedMotion } from "@/lib/reduced-motion";

interface HeroContent {
  name: string;
  title: string;
  tagline: string;
}

const defaultHero: HeroContent = {
  name: "Jonathan Christensen",
  title: "AI Automation Engineer · Forward-deployed systems",
  tagline:
    "I turn service operations into governed AI and automation systems that return measurable capacity—and turn field learning into reusable products and standards.",
};

const Home = () => {
  const supabase = useSupabaseClient();
  const [hero, setHero] = useState<HeroContent>(defaultHero);
  const prefersReducedMotion = useReducedMotion();

  useSEO({
    url: "/",
    description:
      "Jonathan Christensen is an AI Automation Engineer working forward-deployed across service operations: redesigning workflows, shipping governed systems, driving adoption, and measuring capacity returned.",
    keywords: RECRUITING_KEYWORDS,
  });

  useJsonLd([personSchema, websiteSchema, occupationSchema]);

  useEffect(() => {
    async function fetchHero() {
      try {
        const data = await getSiteContent("hero", supabase);
        if (data?.content) {
          try {
            const parsed = JSON.parse(data.content);
            setHero({
              name: parsed.name || defaultHero.name,
              title: parsed.title || defaultHero.title,
              tagline: parsed.tagline || defaultHero.tagline,
            });
          } catch {
            // If not JSON, keep defaults
          }
        }
      } catch (err) {
        captureException(toError(err), {
          context: "Home.fetchHeroContent",
        });
      }
    }
    fetchHero();
  }, [supabase]);

  // Split name into first and last for the staggered animation
  const nameParts = hero.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <PageTransition>
      <section className="h-full flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto">
          {/* Name with staggered letter animation */}
          <div className="overflow-hidden mb-4">
            <motion.h1
              initial={prefersReducedMotion ? { y: 0 } : { y: 100 }}
              animate={{ y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-foreground tracking-tight leading-[0.85]"
            >
              {firstName}
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={prefersReducedMotion ? { y: 0 } : { y: 100 }}
              animate={{ y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.8,
                delay: prefersReducedMotion ? 0 : 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-foreground tracking-tight leading-[0.85]"
            >
              {lastName}
            </motion.h1>
          </div>

          {/* Title */}
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="font-mono text-xl md:text-2xl text-primary mb-6"
          >
            {hero.title}
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12"
          >
            {hero.tagline}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider group"
            >
              <Link to="/work">
                View my work
                <motion.span
                  className="inline-block ml-2"
                  animate={prefersReducedMotion ? undefined : { x: [0, 4, 0] }}
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : { duration: 1.5, repeat: Infinity }
                  }
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
};

export default Home;
