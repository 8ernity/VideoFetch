import React from 'react';

export default function Header({ mobileOpen, setMobileOpen, onNotificationClick }) {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 backdrop-blur-xl bg-surface/80 border-b border-white/5 font-body-md text-primary">
      {/* Mobile Nav Toggle (No top title text) */}
      <div className="flex items-center gap-3 md:pl-64">
        <button
          onClick={() => setMobileNavOpen(!mobileOpen)}
          className="md:hidden text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
        >
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Trailing Actions */}
      <div className="flex items-center gap-4 ml-auto">
        <button
          onClick={onNotificationClick}
          className="text-on-surface-variant hover:text-primary transition-colors duration-200 relative p-1 focus:outline-none"
          title="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-surface shadow-[0_0_8px_#b5ea4d]"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-white/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[20px]">account_circle</span>
        </div>
      </div>
    </header>
  );
}
