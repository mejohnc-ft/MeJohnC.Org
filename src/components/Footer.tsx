import { Separator } from '@/components/ui/separator';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 bg-background">
      <div className="max-w-5xl mx-auto px-6">
        <Separator className="mb-8" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-mono text-sm text-muted-foreground">
            jc_ / {currentYear}
          </div>
          <div className="text-sm text-muted-foreground">
            San Diego, CA
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
