import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { WindowManagerProvider } from './WindowManager';
import MenuBar from './MenuBar';
import Desktop from './Desktop';
import Dock from './Dock';

export default function DesktopShell() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <WindowManagerProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        <MenuBar />
        <Desktop />
        <Dock />
      </div>
    </WindowManagerProvider>
  );
}
