import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Shield } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background grid-pattern flex flex-col">
      <Navbar />
      <main className="pt-16 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
