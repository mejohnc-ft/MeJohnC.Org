import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Type,
  Square,
  Layers,
  Copy,
  Check,
  Download,
  Settings,
  Sparkles,
  Component,
  ExternalLink,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  generateDefaultTokens,
  generateTailwindConfig,
  type GeneratedConfig,
} from '@/lib/tailwind-generator';
import {
  CENTREX_COMPONENT_CATALOG,
  CENTREX_BRAND_COLORS,
} from '@/lib/centrexstyle';
import type { DesignTokens, ColorToken, TypographyToken } from '@/lib/figma-api';
import { useSEO } from '@/lib/seo';
import { ANIMATION } from '@/lib/constants';

// Color swatch component
function ColorSwatch({ color, onCopy }: { color: ColorToken; onCopy: (value: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(color.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group"
    >
      <div
        className="aspect-square rounded-lg shadow-sm border border-border cursor-pointer transition-transform hover:scale-105"
        style={{ backgroundColor: color.value }}
        onClick={handleCopy}
        title={`Click to copy ${color.value}`}
      />
      <div className="mt-2">
        <p className="text-sm font-medium text-foreground truncate">{color.name}</p>
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground font-mono">{color.value}</p>
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Typography preview component
function TypographyPreview({ style }: { style: TypographyToken }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-lg border border-border"
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline">{style.name}</Badge>
        <span className="text-xs text-muted-foreground font-mono">
          {style.fontSize}px / {style.fontWeight}
        </span>
      </div>
      <p
        className="text-foreground"
        style={{
          fontFamily: style.fontFamily,
          fontSize: `${style.fontSize}px`,
          fontWeight: style.fontWeight,
          lineHeight: `${style.lineHeight}px`,
          letterSpacing: `${style.letterSpacing}px`,
        }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
    </motion.div>
  );
}

// Spacing preview component
function SpacingPreview({ value, name }: { value: number; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="bg-primary rounded"
        style={{ width: `${Math.max(value, 4)}px`, height: '24px' }}
      />
      <span className="text-sm text-muted-foreground font-mono w-16">{name}</span>
      <span className="text-sm text-foreground">{value}px</span>
    </div>
  );
}

// Radius preview component
function RadiusPreview({ value, name }: { value: number; name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-16 h-16 bg-primary"
        style={{ borderRadius: value === 9999 ? '9999px' : `${value}px` }}
      />
      <span className="text-xs text-muted-foreground font-mono">{name}</span>
      <span className="text-xs text-foreground">{value === 9999 ? 'full' : `${value}px`}</span>
    </div>
  );
}

export default function AdminStyleGuide() {
  useSEO({ title: 'Style Guide', noIndex: true });

  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [config, setConfig] = useState<GeneratedConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('colors');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    // Load default tokens (in a real app, this would fetch from Figma or stored config)
    const defaultTokens = generateDefaultTokens();
    setTokens(defaultTokens);
    setConfig(generateTailwindConfig(defaultTokens));
    setIsLoading(false);
  }, []);

  const handleCopyColor = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  const handleCopyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const groupedColors = tokens?.colors.reduce(
    (acc, color) => {
      if (!acc[color.category]) {
        acc[color.category] = [];
      }
      acc[color.category].push(color);
      return acc;
    },
    {} as Record<string, ColorToken[]>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Style Guide</h1>
            <p className="text-muted-foreground mt-1">
              Design tokens and component documentation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configure Figma
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Tokens
            </Button>
          </div>
        </div>

        {/* Source Info */}
        {tokens && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{tokens.metadata.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(tokens.metadata.extractedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge variant={tokens.metadata.source === 'figma' ? 'default' : 'secondary'}>
                {tokens.metadata.source === 'figma' ? 'Figma Sync' : 'Default Tokens'}
              </Badge>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="colors" className="gap-2">
              <Palette className="w-4 h-4" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="typography" className="gap-2">
              <Type className="w-4 h-4" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="spacing" className="gap-2">
              <Square className="w-4 h-4" />
              Spacing & Radius
            </TabsTrigger>
            <TabsTrigger value="components" className="gap-2">
              <Component className="w-4 h-4" />
              Components
            </TabsTrigger>
            <TabsTrigger value="assets" className="gap-2">
              <Layers className="w-4 h-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-8 mt-6">
            {groupedColors &&
              Object.entries(groupedColors).map(([category, colors], index) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * ANIMATION.staggerDelay }}
                >
                  <h3 className="text-lg font-semibold text-foreground capitalize mb-4">
                    {category}
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {colors.map((color) => (
                      <ColorSwatch key={color.name} color={color} onCopy={handleCopyColor} />
                    ))}
                  </div>
                </motion.div>
              ))}
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="space-y-4 mt-6">
            {tokens?.typography.map((style, index) => (
              <motion.div
                key={style.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * ANIMATION.staggerDelay }}
              >
                <TypographyPreview style={style} />
              </motion.div>
            ))}
          </TabsContent>

          {/* Spacing & Radius Tab */}
          <TabsContent value="spacing" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Spacing */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Spacing Scale</h3>
                <div className="space-y-3">
                  {tokens?.spacing.map((s) => (
                    <SpacingPreview
                      key={s.name}
                      name={s.name.replace('spacing-', '')}
                      value={s.value}
                    />
                  ))}
                </div>
              </Card>

              {/* Border Radius */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Border Radius</h3>
                <div className="flex flex-wrap gap-6">
                  {tokens?.radii.map((r) => (
                    <RadiusPreview key={r.name} name={r.name} value={r.value} />
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-6 mt-6">
            {/* Overview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Generative UI Components</h3>
                </div>
                <a href="/admin/generative">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Open Generator
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
              <p className="text-muted-foreground mb-4">
                These components use CentrexStyle design tokens and can be generated via natural language prompts.
              </p>
            </Card>

            {/* Component Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(CENTREX_COMPONENT_CATALOG).map(([key, component], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 h-full hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Layers className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{component.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="outline">{component.category}</Badge>
                          {'variants' in component && (
                            <span className="text-xs text-muted-foreground">
                              {(component.variants as string[]).length} color variants
                            </span>
                          )}
                          {'chartTypes' in component && (
                            <span className="text-xs text-muted-foreground">
                              {(component.chartTypes as string[]).length} chart types
                            </span>
                          )}
                          {'layouts' in component && (
                            <span className="text-xs text-muted-foreground">
                              {(component.layouts as string[]).length} layouts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Brand Colors Reference */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Component Color Variants</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Components that support color variants use these CentrexStyle brand colors:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(CENTREX_BRAND_COLORS).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div
                      className="w-8 h-8 rounded-lg shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div>
                      <p className="text-sm font-medium">{key}</p>
                      <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6 mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Brand Assets</h3>
                <Button variant="outline" size="sm" className="gap-2" disabled>
                  <Download className="w-4 h-4" />
                  Download All
                </Button>
              </div>
              <p className="text-muted-foreground mb-6">
                Logos, icons, and brand assets for CentrexStyle. Assets are managed in the style guide database.
              </p>

              {/* Asset Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Logo Assets */}
                <Card className="p-4 border-dashed">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                      🎨
                    </div>
                    <div>
                      <h4 className="font-medium">Logos</h4>
                      <p className="text-xs text-muted-foreground">Primary brand marks</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No logo assets uploaded yet. Add logos via the asset management API.
                  </p>
                </Card>

                {/* Icon Assets */}
                <Card className="p-4 border-dashed">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-2xl">
                      ✨
                    </div>
                    <div>
                      <h4 className="font-medium">Icons</h4>
                      <p className="text-xs text-muted-foreground">UI icons and symbols</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Using Lucide icons. Custom icons can be added via asset management.
                  </p>
                </Card>

                {/* Font Assets */}
                <Card className="p-4 border-dashed">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-2xl">
                      🔤
                    </div>
                    <div>
                      <h4 className="font-medium">Fonts</h4>
                      <p className="text-xs text-muted-foreground">Typography assets</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• GilmerBold - Headings</p>
                    <p>• Hind - Body text</p>
                    <p>• Consolas - Code</p>
                  </div>
                </Card>
              </div>
            </Card>

            {/* Color Swatches as downloadable assets */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Color Palette Assets</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click a color to copy its hex value. These are the official CentrexStyle brand colors.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(CENTREX_BRAND_COLORS).map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => {
                      navigator.clipboard.writeText(color.hex);
                    }}
                    className="group p-4 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                  >
                    <div
                      className="w-full aspect-video rounded-lg mb-3"
                      style={{ backgroundColor: color.hex }}
                    />
                    <p className="font-medium text-sm">{color.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                    <p className="text-xs text-muted-foreground">{color.pms}</p>
                    <p className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                      Click to copy
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6 mt-6">
            {config && (
              <>
                {/* CSS Variables */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">CSS Variables</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(config.cssVariables, 'css')}
                    >
                      {copiedCode === 'css' ? (
                        <Check className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      {copiedCode === 'css' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground">
                    {config.cssVariables}
                  </pre>
                </Card>

                {/* Tailwind Config */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Tailwind Config</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(config.jsConfig, 'js')}
                    >
                      {copiedCode === 'js' ? (
                        <Check className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      {copiedCode === 'js' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground max-h-[400px]">
                    {config.jsConfig}
                  </pre>
                </Card>

                {/* Documentation */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Documentation</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(config.documentation, 'docs')}
                    >
                      {copiedCode === 'docs' ? (
                        <Check className="w-4 h-4 mr-2" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      {copiedCode === 'docs' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground max-h-[400px]">
                    {config.documentation}
                  </pre>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
