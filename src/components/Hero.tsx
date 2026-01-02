import { Download, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Hero = () => {
  const handleDownloadResume = async () => {
    try {
      const link = document.createElement('a');
      link.href = '/Resume 2025.pdf';
      link.download = 'Jonathan_Christensen_Resume_2025.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading resume:', error);
      window.location.href = "mailto:mejohnwc@gmail.com?subject=Resume%20Request&body=Hi%20Jonathan%2C%0D%0A%0D%0AI%27d%20like%20to%20request%20a%20copy%20of%20your%20resume.%0D%0A%0D%0ABest%20regards";
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="relative z-10 px-6 max-w-4xl mx-auto">
        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-12">
          <span className="inline-block w-2 h-2 bg-primary rounded-full" />
          <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
            Available for hire
          </span>
        </div>

        {/* Name - stark, large */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-foreground tracking-tight leading-[0.9] mb-6">
          Jonathan
          <br />
          Christensen
        </h1>

        {/* Title - monospace accent */}
        <p className="font-mono text-lg md:text-xl text-primary mb-4">
          AI Automation Engineer II
        </p>

        {/* Tagline */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-4">
          Building agentic systems, automation pipelines, and AI-powered workflows.
          Obsessed with measuring cost, benchmarking performance, and shipping fast.
        </p>

        {/* Location */}
        <div className="flex items-center gap-2 text-muted-foreground mb-12">
          <MapPin className="w-4 h-4" />
          <span className="font-mono text-sm">San Diego, CA</span>
        </div>

        {/* CTA buttons - brutalist style */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleDownloadResume}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider px-8 py-6 text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Resume
          </Button>

          <Button
            variant="outline"
            asChild
            className="border-border hover:border-primary hover:text-primary font-mono uppercase tracking-wider px-8 py-6 text-sm"
          >
            <a href="mailto:mejohnwc@gmail.com?subject=Let%27s%20Connect&body=Hi%20Jonathan%2C%0D%0A%0D%0AI%27d%20like%20to%20discuss%20potential%20opportunities.%0D%0A%0D%0ABest%20regards">
              <Mail className="w-4 h-4 mr-2" />
              Let's Connect
            </a>
          </Button>
        </div>
      </div>

      {/* Minimal scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-px h-16 bg-border" />
      </div>
    </section>
  );
};

export default Hero;
