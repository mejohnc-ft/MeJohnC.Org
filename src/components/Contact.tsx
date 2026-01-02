import { Button } from '@/components/ui/button';
import { Mail, Linkedin, Github, Calendar } from 'lucide-react';

const Contact = () => {
  const links = [
    {
      label: "Email",
      href: "mailto:mejohnwc@gmail.com",
      icon: Mail,
      value: "mejohnwc@gmail.com"
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/mejohnc/",
      icon: Linkedin,
      value: "/in/mejohnc"
    },
    {
      label: "GitHub",
      href: "https://github.com/mejohnc-ft",
      icon: Github,
      value: "@mejohnc-ft"
    },
    {
      label: "Calendar",
      href: "https://calendly.com/jonathan-christensen",
      icon: Calendar,
      value: "Book a call"
    }
  ];

  return (
    <section id="contact" className="py-24 bg-card">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section header */}
        <div className="mb-16">
          <span className="font-mono text-sm text-primary uppercase tracking-widest">
            Contact
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-foreground mt-2 mb-6">
            Get in touch
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            I respond within 24 hours. Let's talk about AI agents, automation,
            or whatever you're building.
          </p>
        </div>

        {/* Links grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              target={link.href.startsWith('mailto') ? undefined : '_blank'}
              rel={link.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
              className="flex items-center gap-4 p-4 border border-border hover:border-primary transition-colors group"
            >
              <link.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  {link.label}
                </div>
                <div className="text-foreground group-hover:text-primary transition-colors">
                  {link.value}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* CTA */}
        <Button
          asChild
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider px-8 py-6 text-sm"
        >
          <a href="mailto:mejohnwc@gmail.com?subject=Let%27s%20Connect&body=Hi%20Jonathan%2C%0D%0A%0D%0AI%27d%20like%20to%20discuss...%0D%0A%0D%0ABest%20regards">
            <Mail className="w-4 h-4 mr-2" />
            Send an email
          </a>
        </Button>
      </div>
    </section>
  );
};

export default Contact;
