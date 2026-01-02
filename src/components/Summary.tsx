import { Separator } from '@/components/ui/separator';

const Summary = () => {
  const stats = [
    { value: "70%", label: "Automation rate on provisioning" },
    { value: "6,000+", label: "Users across hybrid environments" },
    { value: "60%", label: "Reduction in triage time with AI" }
  ];

  return (
    <section className="py-24 bg-card">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-12">
          <span className="font-mono text-sm text-primary uppercase tracking-widest">
            About
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-foreground mt-2 mb-8">
            I build systems that work.
          </h2>
        </div>

        {/* Main content */}
        <div className="space-y-6 text-lg text-muted-foreground mb-12">
          <p>
            AI Automation Engineer obsessed with making AI agents actually useful.
            Not the "slap an LLM on it" kind of useful—the kind where you measure
            token costs, benchmark latency, and ship workflows that survive production.
          </p>
          <p>
            Currently focused on{' '}
            <span className="text-foreground">agentic systems</span>,{' '}
            <span className="text-foreground">agent management planes</span>, and
            the infrastructure that makes autonomous AI reliable. I care about
            evals, cost tracking, and knowing when an agent is actually doing its job.
          </p>
          <p>
            Background in enterprise IT—Azure, Intune, M365 at scale. Now applying
            that systems thinking to AI workflows. If it touches automation, I've
            probably broken it, fixed it, and automated the fix.
          </p>
        </div>

        <Separator className="mb-12" />

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div key={index}>
              <div className="font-mono text-4xl md:text-5xl font-black text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Summary;
