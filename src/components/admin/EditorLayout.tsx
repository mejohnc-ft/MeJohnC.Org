import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Loader2, Send, Clock } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import EditorPanel from '@/components/admin/EditorPanel';
import { Button } from '@/components/ui/button';

interface EditorAction {
  label: string;
  icon: typeof Save;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  disabled?: boolean;
  show?: boolean;
}

interface EditorLayoutProps {
  children: ReactNode;
  sidePanel: ReactNode;
  sidePanelTitle: string;
  backPath: string;
  backLabel: string;
  viewPath?: string;
  viewLabel?: string;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  onSave: () => void;
  saveLabel?: string;
  publishAction?: {
    label: string;
    onClick: () => void;
    show?: boolean;
  };
  scheduleAction?: {
    onClick: () => void;
    show?: boolean;
  };
  additionalActions?: EditorAction[];
}

export function EditorLayout({
  children,
  sidePanel,
  sidePanelTitle,
  backPath,
  backLabel,
  viewPath,
  viewLabel = 'View',
  isSaving,
  isLoading,
  error,
  onSave,
  saveLabel = 'Save',
  publishAction,
  scheduleAction,
  additionalActions = [],
}: EditorLayoutProps) {
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] -m-8">
        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-border">
            <Link
              to={backPath}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{backLabel}</span>
            </Link>

            <div className="flex items-center gap-2">
              {viewPath && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={viewPath} target="_blank">
                    <Eye className="w-4 h-4 mr-2" />
                    {viewLabel}
                  </Link>
                </Button>
              )}

              {additionalActions.map((action, index) => (
                action.show !== false && (
                  <Button
                    key={index}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={action.onClick}
                    disabled={action.disabled || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <action.icon className="w-4 h-4 mr-2" />
                    )}
                    {action.label}
                  </Button>
                )
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saveLabel}
              </Button>

              {scheduleAction?.show && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={scheduleAction.onClick}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4 mr-2" />
                  )}
                  Schedule
                </Button>
              )}

              {publishAction?.show && (
                <Button
                  size="sm"
                  onClick={publishAction.onClick}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {publishAction.label}
                </Button>
              )}
            </div>
          </div>

          {/* Editor content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
                  role="alert"
                >
                  {error}
                </motion.div>
              )}

              {children}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <EditorPanel title={sidePanelTitle}>
          {sidePanel}
        </EditorPanel>
      </div>
    </AdminLayout>
  );
}

export default EditorLayout;
