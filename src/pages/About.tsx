import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PageTransition, { fadeInUp, staggerContainer } from '@/components/PageTransition';

const About = () => {
  const stats = [
    { value: "70%", label: "Automation rate on provisioning" },
    { value: "6,000+", label: "Users across hybrid environments" },
    { value: "60%", label: "Reduction in triage time with AI" }
  ];

  const skillCategories = [
    {
      title: "AI & Agents",
      skills: ["Claude Code", "Agentic Workflows", "Tool Use", "RAG Systems", "Prompt Engineering", "RLHF", "Benchmarking", "Cost Optimization"]
    },
    {
      title: "Infrastructure",
      skills: ["Azure / Entra ID", "Docker", "Proxmox", "n8n / Make.com", "Graph API", "Intune / SCCM", "Observability"]
    },
    {
      title: "Development",
      skills: ["TypeScript", "Python", "PowerShell", "Bash", "REST APIs", "React / Next.js", "Node.js"]
    },
    {
      title: "Platform",
      skills: ["Agent Management", "Token Economics", "Eval Frameworks", "CI/CD", "Process Automation"]
    }
  ];

  const experiences = [
    {
      title: "AI Automation Engineer II",
      company: "centrexIT",
      period: "2023 — Present",
      highlights: [
        "Designed agentic workflows in n8n, Make.com, and Power Automate—reduced provisioning time by 70%",
        "Built AI-driven service desk triage using custom LLM pipelines, cutting manual routing by 60%",
        "Containerized workflows with Docker on Proxmox; maintained M365/Entra/Intune integrations at scale"
      ],
    },
    {
      title: "Field Support Engineer II",
      company: "centrexIT",
      period: "2024 — Present",
      highlights: [
        "Frontline support for 6,000+ users—99.8% CSAT, strict SLA adherence",
        "On-site infrastructure: switches, firewalls, racks, CCTV, Wi-Fi deployments",
      ],
    },
    {
      title: "Provisioning Engineer",
      company: "centrexIT",
      period: "2022 — 2024",
      highlights: [
        "Led endpoint provisioning across hybrid environments—Intune, SCCM, Entra ID",
        "Architected Autopilot + Conditional Access deployment pipelines",
      ],
    },
  ];

  return (
    <PageTransition>
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-12">
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              About
            </span>
            <h1 className="text-5xl md:text-6xl font-black text-foreground mt-2 mb-8">
              I build systems that work.
            </h1>
          </motion.div>

          {/* Bio */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="space-y-6 text-lg text-muted-foreground mb-16"
          >
            <motion.p variants={fadeInUp}>
              AI Automation Engineer obsessed with making AI agents actually useful.
              Not the "slap an LLM on it" kind of useful—the kind where you measure
              token costs, benchmark latency, and ship workflows that survive production.
            </motion.p>
            <motion.p variants={fadeInUp}>
              Currently focused on{' '}
              <span className="text-foreground">agentic systems</span>,{' '}
              <span className="text-foreground">agent management planes</span>, and
              the infrastructure that makes autonomous AI reliable. I care about
              evals, cost tracking, and knowing when an agent is actually doing its job.
            </motion.p>
            <motion.p variants={fadeInUp}>
              Background in enterprise IT—Azure, Intune, M365 at scale. Now applying
              that systems thinking to AI workflows.
            </motion.p>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 mb-16"
          >
            {stats.map((stat, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                  className="font-mono text-4xl md:text-5xl font-black text-primary mb-2"
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <Separator className="mb-16" />

          {/* Skills */}
          <motion.div variants={fadeInUp} className="mb-8">
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              Skills
            </span>
            <h2 className="text-3xl font-black text-foreground mt-2">Technical Stack</h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 mb-16"
          >
            {skillCategories.map((category, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
                  {category.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Badge
                        variant="outline"
                        className="font-mono text-xs px-3 py-1.5 border-border hover:border-primary hover:text-primary transition-colors cursor-default"
                      >
                        {skill}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <Separator className="mb-16" />

          {/* Experience */}
          <motion.div variants={fadeInUp} className="mb-12">
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              Experience
            </span>
            <h2 className="text-3xl font-black text-foreground mt-2">Work History</h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="space-y-12"
          >
            {experiences.map((exp, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="relative pl-8 border-l border-border hover:border-primary transition-colors"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  className="absolute left-0 top-0 w-2 h-2 -translate-x-[5px] rounded-full bg-primary"
                />
                <div className="font-mono text-sm text-muted-foreground mb-1">
                  {exp.period}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">{exp.title}</h3>
                <p className="text-muted-foreground mb-4">{exp.company}</p>
                <ul className="space-y-2">
                  {exp.highlights.map((highlight, i) => (
                    <li key={i} className="text-muted-foreground text-sm pl-4 border-l border-border">
                      {highlight}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
};

export default About;
