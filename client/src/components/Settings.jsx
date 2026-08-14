import React from 'react';

export default function Settings({ settings, updateSetting, resetSettings, onClearAllData }) {
  const accentColors = [
    { id: 'lime', name: 'Neon Lime', hex: '#b5ea4d', border: 'border-[#b5ea4d]' },
    { id: 'cyan', name: 'Cyber Cyan', hex: '#00f0ff', border: 'border-[#00f0ff]' },
    { id: 'purple', name: 'Electric Purple', hex: '#a855f7', border: 'border-[#a855f7]' },
    { id: 'orange', name: 'Sunset Orange', hex: '#f97316', border: 'border-[#f97316]' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 max-w-4xl" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Customize application preferences, quality defaults, download speeds, and themes.</p>
      </div>

      {/* CATEGORY 1: MEDIA & QUALITY DEFAULTS */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-6 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
          <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
          <h2 className="font-body-lg text-on-surface font-semibold text-lg">Media & Quality Defaults</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Default Video Resolution */}
          <div className="flex flex-col gap-2">
            <label className="font-body-md text-on-surface font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">hd</span>
              Default Video Resolution
            </label>
            <p className="text-xs text-on-surface-variant">Auto-selects this quality when analyzing new videos.</p>
            <select
              value={settings.defaultResolution}
              onChange={(e) => updateSetting('defaultResolution', e.target.value)}
              className="bg-surface-container border border-white/10 text-on-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            >
              <option value="best">Best Available (1080p / 4K)</option>
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD</option>
              <option value="480p">480p SD</option>
            </select>
          </div>

          {/* Default Audio Bitrate */}
          <div className="flex flex-col gap-2">
            <label className="font-body-md text-on-surface font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">graphic_eq</span>
              Default Audio Bitrate (MP3)
            </label>
            <p className="text-xs text-on-surface-variant">Pre-selected bitrate when toggled to Audio mode.</p>
            <select
              value={settings.defaultAudioBitrate}
              onChange={(e) => updateSetting('defaultAudioBitrate', e.target.value)}
              className="bg-surface-container border border-white/10 text-on-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            >
              <option value="320k">320 kbps (Maximum Quality)</option>
              <option value="256k">256 kbps (High Quality)</option>
              <option value="192k">192 kbps (Medium Quality)</option>
              <option value="128k">128 kbps (Standard Quality)</option>
              <option value="96k">96 kbps (Low Quality)</option>
            </select>
          </div>
        </div>
      </div>

      {/* CATEGORY 2: DOWNLOAD ACCELERATION & SPEED */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-6 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
          <span className="material-symbols-outlined text-primary text-[22px]">rocket_launch</span>
          <h2 className="font-body-lg text-on-surface font-semibold text-lg">Download Acceleration & Speed</h2>
        </div>

        {/* Multi-thread Acceleration Toggle */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h3 className="font-body-md text-on-surface font-semibold flex items-center gap-2">
              Multi-Thread Chunk Acceleration
              <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded font-mono">4x SPEED</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">Split downloads into parallel stream segments for maximum speed.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.multiThreadAccel}
              onChange={(e) => updateSetting('multiThreadAccel', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>

        {/* Max Concurrent Downloads */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-body-md text-on-surface font-semibold">Max Concurrent Downloads</h3>
            <p className="text-xs text-on-surface-variant mt-1">Maximum active downloads running simultaneously.</p>
          </div>
          <select
            value={settings.maxConcurrentDownloads}
            onChange={(e) => updateSetting('maxConcurrentDownloads', Number(e.target.value))}
            className="bg-surface-container border border-white/10 text-on-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
          >
            <option value={1}>1 Task</option>
            <option value={2}>2 Tasks</option>
            <option value={3}>3 Tasks (Recommended)</option>
            <option value={5}>5 Tasks</option>
          </select>
        </div>
      </div>

      {/* CATEGORY 5: APPEARANCE & THEME ACCENTS */}
      <div className="glass-panel rounded-xl p-6 flex flex-col gap-6 border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
          <span className="material-symbols-outlined text-primary text-[22px]">palette</span>
          <h2 className="font-body-lg text-on-surface font-semibold text-lg">Appearance & Theme Accents</h2>
        </div>

        <div>
          <label className="font-body-md text-on-surface font-medium block mb-1">Accent Highlight Color</label>
          <p className="text-xs text-on-surface-variant mb-4">Choose your preferred UI accent theme color.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {accentColors.map((color) => {
              const isSelected = settings.accentColor === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => updateSetting('accentColor', color.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isSelected
                      ? `${color.border} bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.08)]`
                      : 'border-white/5 bg-surface-container hover:bg-surface-container-highest'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shadow"
                    style={{ backgroundColor: color.hex }}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-black text-[16px] font-bold">check</span>
                    )}
                  </div>
                  <span className="font-body-md text-sm text-on-surface font-medium">{color.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESET & DATA CLEANUP */}
      <div className="glass-panel rounded-xl p-6 flex items-center justify-between border border-white/10">
        <div>
          <h3 className="font-body-lg text-on-surface font-semibold text-error">Reset & Clear Data</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Reset settings to defaults and wipe download history cache.</p>
        </div>
        <button
          onClick={() => {
            resetSettings();
            if (onClearAllData) onClearAllData();
          }}
          className="bg-error/10 text-error border border-error/20 hover:bg-error/20 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">delete_forever</span>
          Reset All Data
        </button>
      </div>
    </div>
  );
}
