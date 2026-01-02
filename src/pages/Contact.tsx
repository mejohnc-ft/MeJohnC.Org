import { motion } from 'framer-motion';
import { Mail, Linkedin, Github, Calendar, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageTransition, { fadeInUp, staggerContainer } from '@/components/PageTransition';

const Contact = () => {
  const links = [
    {
      label: "Email",
      href: "mailto:mejohnwc@gmail.com",
      icon: Mail,
      value: "mejohnwc@gmail.com",
      description: "Best way to reach me"
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/mejohnc/",
      icon: Linkedin,
      value: "/in/mejohnc",
      description: "Let's connect"
    },
    {
      label: "GitHub",
      href: "https://github.com/mejohnc-ft",
      icon: Github,
      value: "@mejohnc-ft",
      description: "See my code"
    },
    {
      label: "Calendar",
      href: "https://calendly.com/jonathan-christensen",
      icon: Calendar,
      value: "Book a call",
      description: "Schedule time to chat"
    }
  ];

  return (
    <PageTransition>
      <section className="py-24 px-6 min-h-[calc(100vh-8rem)] flex items-center">
        <div className="max-w-4xl mx-auto w-full">
          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-16">
            <span className="font-mono text-sm text-primary uppercase tracking-widest">
              Contact
            </span>
            <h1 className="text-5xl md:text-6xl font-black text-foreground mt-2 mb-6">
              Get in touch
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              I respond within 24 hours. Let's talk about AI agents, automation,
              or whatever you're building.
            </p>
          </motion.div>

          {/* Links grid */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-4 mb-12"
          >
            {links.map((link, index) => (
              <motion.a
                key={index}
                href={link.href}
                target={link.href.startsWith('mailto') ? undefined : '_blank'}
                rel={link.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                variants={fadeInUp}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-6 border border-border hover:border-primary transition-all duration-300 group bg-card/50 backdrop-blur-sm"
              >
                <motion.div
                  whileHover={{ rotate: 12 }}
                  className="p-3 bg-secondary rounded-lg"
                >
                  <link.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                      {link.label}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-foreground group-hover:text-primary transition-colors font-medium">
                    {link.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {link.description}
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider"
            >
              <motion.a
                href="mailto:mejohnwc@gmail.com?subject=Let%27s%20Connect&body=Hi%20Jonathan%2C%0D%0A%0D%0AI%27d%20like%20to%20discuss...%0D%0A%0D%0ABest%20regards"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send an email
              </motion.a>
            </Button>
          </motion.div>

          {/* Fun message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-16 text-sm text-muted-foreground font-mono"
          >
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              _
            </motion.span>{' '}
            Currently in San Diego, CA
          </motion.p>
        </div>
      </section>
    </PageTransition>
  );
};

export default Contact;
