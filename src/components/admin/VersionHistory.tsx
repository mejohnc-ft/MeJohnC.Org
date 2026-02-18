import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getContentVersions,
  restoreVersion,
  compareVersions,
  type ContentVersion,
} from "@/lib/audit";
import { captureException } from "@/lib/sentry";

interface VersionHistoryProps {
  tableName: string;
  recordId: string;
  onRestore?: () => void;
}

export default function VersionHistory({
  tableName,
  recordId,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const data = await getContentVersions(tableName, recordId);
        setVersions(data);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "VersionHistory.fetchVersions",
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (isOpen) {
      fetchVersions();
    }
  }, [tableName, recordId, isOpen]);

  const handleRestore = async (versionNumber: number) => {
    if (
      !confirm(
        `Are you sure you want to restore version ${versionNumber}? This will overwrite current content.`,
      )
    ) {
      return;
    }

    setIsRestoring(true);
    try {
      await restoreVersion(tableName, recordId, versionNumber);
      // Refresh versions
      const data = await getContentVersions(tableName, recordId);
      setVersions(data);
      onRestore?.();
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "VersionHistory.restore",
      });
      toast.error("Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getChangedFields = (version: ContentVersion, index: number) => {
    if (index >= versions.length - 1) return null; // First version has no comparison
    const prevVersion = versions[index + 1];
    const diff = compareVersions(prevVersion, version);
    return Object.keys(diff);
  };

  if (versions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="w-4 h-4" />
        <span>Version History</span>
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {versions.length} versions
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="mt-4 p-4 bg-card/50">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {versions.map((version, index) => {
                    const changedFields = getChangedFields(version, index);
                    const isExpanded =
                      expandedVersion === version.version_number;
                    const isCurrent = index === 0;

                    return (
                      <div
                        key={version.id}
                        className={`p-3 rounded-lg border ${
                          isCurrent
                            ? "border-primary/50 bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        } transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              v{version.version_number}
                            </span>
                            {isCurrent && (
                              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(version.created_at)}
                            </span>
                            {!isCurrent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRestore(version.version_number)
                                }
                                disabled={isRestoring}
                                className="h-7 px-2 text-xs"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>

                        {version.change_summary && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.change_summary}
                          </p>
                        )}

                        {changedFields && changedFields.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() =>
                                setExpandedVersion(
                                  isExpanded ? null : version.version_number,
                                )
                              }
                              className="text-xs text-primary hover:underline"
                            >
                              {isExpanded
                                ? "Hide changes"
                                : `Show ${changedFields.length} changed fields`}
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2 space-y-1">
                                    {changedFields.map((field) => (
                                      <div
                                        key={field}
                                        className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded"
                                      >
                                        {field.replace(/_/g, " ")}
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
