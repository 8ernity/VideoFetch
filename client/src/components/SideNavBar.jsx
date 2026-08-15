import React from 'react';

export default function SideNavBar({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) {
  const tabs = [
    { id: 'downloader', label: 'Downloader', icon: 'download' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <nav
        className={`fixed left-0 top-16 md:top-16 h-[calc(100vh-64px)] w-64 flex-col p-4 z-40 bg-surface-container border-r border-white/5 shadow-md font-body-md text-primary transition-transform duration-300 ${
          mobileOpen ? 'flex translate-x-0' : 'hidden md:flex -translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Logo & Prominent Title */}
        <div className="mb-8 px-1 pt-1">
          <div className="flex items-center gap-3.5">
            <img
              src="/logo.png"
              alt="VideoFetch Logo"
              className="w-13 h-13 object-contain rounded-xl shadow-[0_0_20px_rgba(0,195,255,0.45)] transition-transform duration-300 hover:scale-105"
            />
            <div>
              <h3 className="font-headline-md text-primary text-[28px] sm:text-[30px] leading-none font-black tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                Video<span className="text-white">Fetch</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <ul className="space-y-2 flex-grow">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(163,215,60,0.25)]'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Help & Bottom Branding */}
        <div className="mt-auto pt-3 border-t border-white/5 space-y-3">
          <button
            onClick={() => {
              setActiveTab('help');
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-2.5 font-medium transition-all duration-200 ${
              activeTab === 'help'
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(163,215,60,0.25)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: activeTab === 'help' ? "'FILL' 1" : "'FILL' 0" }}
            >
              help
            </span>
            <span className="text-sm">Help</span>
          </button>

          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <img
              src="/8ernity_brand.png"
              alt="8ernity Branding"
              className="w-full max-w-[110px] h-auto object-contain opacity-75 hover:opacity-100 transition-opacity duration-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      </nav>
    </>
  );
}
