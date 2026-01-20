/**
 * AssetLibrary Component
 *
 * Displays a grid of brand assets with filtering and search.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ExternalLink, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Asset, AssetType } from '../schemas';

interface AssetCardProps {
  asset: Asset;
}

function AssetCard({ asset }: AssetCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Card className="overflow-hidden">
        <div className="aspect-video bg-muted relative">
          {asset.thumbnail_url ? (
            <img
              src={asset.thumbnail_url}
              alt={asset.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">{getAssetIcon(asset.type)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(asset.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadAsset(asset)}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-medium text-foreground truncate">{asset.name}</h3>
          {asset.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {asset.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline">{asset.type}</Badge>
            {asset.file_size && (
              <span className="text-xs text-muted-foreground">
                {formatFileSize(asset.file_size)}
              </span>
            )}
          </div>
          {asset.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {asset.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

interface AssetLibraryProps {
  assets: Asset[];
  onSearch?: (query: string) => void;
  onFilterByType?: (type: AssetType | null) => void;
}

export function AssetLibrary({ assets, onSearch, onFilterByType }: AssetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleTypeFilter = (type: AssetType | null) => {
    setSelectedType(type);
    onFilterByType?.(type);
  };

  const assetTypes: AssetType[] = ['logo', 'icon', 'image', 'illustration', 'font', 'document'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedType === null ? 'default' : 'outline'}
            onClick={() => handleTypeFilter(null)}
          >
            All
          </Button>
          {assetTypes.map((type) => (
            <Button
              key={type}
              size="sm"
              variant={selectedType === type ? 'default' : 'outline'}
              onClick={() => handleTypeFilter(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No assets found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper functions

function getAssetIcon(type: AssetType): string {
  const icons: Record<AssetType, string> = {
    logo: '🎨',
    icon: '✨',
    image: '🖼️',
    illustration: '🎭',
    font: '🔤',
    document: '📄',
    other: '📦',
  };
  return icons[type] || icons.other;
}

function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function downloadAsset(asset: Asset): void {
  const link = document.createElement('a');
  link.href = asset.url;
  link.download = asset.name;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
