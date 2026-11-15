import { Outlet } from 'react-router-dom';
import { MagnetTabBar } from './ui/MagnetTabBar';

export function MainLayout() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <Outlet />
      <MagnetTabBar />
    </div>
  );
}
