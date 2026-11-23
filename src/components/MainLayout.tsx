import { Outlet, useLocation } from 'react-router-dom';
import { MagnetTabBar } from './ui/MagnetTabBar';
import { SwipeableTabsView, isMainTabPath } from './SwipeableTabsView';

export function MainLayout() {
  const location = useLocation();
  const isMainTab = isMainTabPath(location.pathname);

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {isMainTab ? <SwipeableTabsView /> : <Outlet />}
      <MagnetTabBar />
    </div>
  );
}
