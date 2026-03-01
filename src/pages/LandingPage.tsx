import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  Users,
  Bot,
  BarChart3,
  Globe,
  Layers,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/lib/seo";

const features = [
  {
    icon: FileText,
    title: "Blog & Content",
    description:
      "Markdown editor, SEO tools, scheduling, and version history. Publish from one place.",
  },
  {
    icon: Users,
    title: "CRM & Contacts",
    description:
      "Track leads, manage pipelines, automate follow-ups, and nurture relationships.",
  },
  {
    icon: Bot,
    title: "AI Agents",
    description:
      "Autonomous agents that handle tasks, automate workflows, and integrate with your tools.",
  },
  {
    icon: BarChart3,
    title: "Metrics & Analytics",
    description:
      "Custom dashboards, data sources, and real-time metrics to measure what matters.",
  },
  {
    icon: Globe,
    title: "Multi-Tenant",
    description:
      "One platform, many workspaces. Custom domains, branding, and isolated data per tenant.",
  },
  {
    icon: Layers,
    title: "Site Builder",
    description:
      "Drag-and-drop page builder with templates, components, and instant publishing.",
  },
];

const LandingPage = () => {
  useSEO({
    title: "Business OS — Your Website & Business Tools in One Platform",
    description:
      "Blog, CRM, AI agents, metrics, and more. Everything you need to run your business online.",
    url: "/",
  });

  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative px-6 py-24 md:py-32 overflow-hidden">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-tight">
                Your website &{" "}
                <span className="text-primary">business tools</span> in one
                platform
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Blog, CRM, AI agents, analytics, email marketing, and more.
                Everything you need to build, grow, and run your business
                online.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="text-base px-8">
                <Link to="/admin/login">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-base px-8"
              >
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </motion.div>
          </div>

          {/* Background gradient */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Everything you need, nothing you don't
              </h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                A unified platform that replaces your scattered tools with one
                integrated experience.
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Ready to get started?
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Start for free, upgrade as you grow. No credit card required.
              </p>
              <div className="mt-8">
                <Button asChild size="lg" className="text-base px-8">
                  <Link to="/admin/login">
                    Start for Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default LandingPage;
