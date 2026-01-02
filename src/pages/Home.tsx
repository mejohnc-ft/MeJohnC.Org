import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';

const Home = () => {
  const handleDownloadResume = () => {
    const link = document.createElement('a');
    link.href = '/Resume 2025.pdf';
    link.download = 'Jonathan_Christensen_Resume_2025.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageTransition>
      <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center gap-2 mb-8"
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block w-2 h-2 bg-primary rounded-full"
            />
            <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
              Available for hire
            </span>
          </motion.div>

          {/* Name with staggered letter animation */}
          <div className="overflow-hidden mb-4">
            <motion.h1
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-foreground tracking-tight leading-[0.85]"
            >
              Jonathan
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-foreground tracking-tight leading-[0.85]"
            >
              Christensen
            </motion.h1>
          </div>

          {/* Title */}
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="font-mono text-xl md:text-2xl text-primary mb-6"
          >
            AI Automation Engineer
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12"
          >
            Building agentic systems, automation pipelines, and AI-powered workflows.
            Obsessed with measuring cost, benchmarking performance, and shipping fast.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex flex-wrap gap-4"
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
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadResume}
              className="font-mono uppercase tracking-wider border-border hover:border-primary hover:text-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              Resume
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-px h-16 bg-gradient-to-b from-primary to-transparent"
        />
      </motion.div>
    </PageTransition>
  );
};

export default Home;
