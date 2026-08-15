import React from 'react';

export default function Help({ onGoToDownloader }) {
  const faqs = [
    {
      q: 'How do I download a video?',
      a: 'Simply paste any video link into the URL input box, click "Fetch Info" or press Enter. Select your preferred resolution or audio format, then click "Download".',
    },
    {
      q: 'Which platforms are supported?',
      a: 'VideoFetch supports YouTube, Twitter/X, Instagram, TikTok, Reddit, Vimeo, Dailymotion, Facebook, Pinterest, Bilibili, Twitch clips, SoundCloud, and 1000+ public video streaming sites.',
    },
    {
      q: 'How does video trimming work?',
      a: 'After analyzing a video, use the interactive Video Trimmer slider to select custom start and end times. Only the selected section will be extracted.',
    },
    {
      q: 'Why am I getting a download error or black screen?',
      a: 'Make sure the URL is public and not private/age-restricted. If a download stalls, try selecting a different resolution (e.g. 720p or MP3) or refresh the link.',
    },
    {
      q: 'Is VideoFetch free to use?',
      a: 'Yes! VideoFetch is 100% open-source, free, and does not require any account registration or subscription.',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-2xl glow-active relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">help</span>
            User Guide & Documentation
          </div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">
            How can we help you?
          </h2>
          <p className="text-on-surface-variant max-w-xl text-sm leading-relaxed">
            Get instant answers on supported sites, downloading options, video trimming, and troubleshooting.
          </p>
          <div className="pt-2">
            <button
              onClick={onGoToDownloader}
              className="bg-primary text-on-primary-fixed hover:bg-primary-fixed transition-all rounded-lg px-5 py-2.5 font-bold text-sm inline-flex items-center gap-2 shadow-[0_0_15px_rgba(154,205,50,0.3)]"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Go to Downloader
            </button>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            1
          </div>
          <h3 className="font-bold text-on-surface text-base">Paste Video URL</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Copy the link from YouTube, Twitter/X, Instagram, or TikTok and paste it into the search input.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            2
          </div>
          <h3 className="font-bold text-on-surface text-base">Choose Format & Trim</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Pick your desired resolution (4K, 1080p, 720p) or MP3 audio option. Optionally adjust start/end timestamps.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            3
          </div>
          <h3 className="font-bold text-on-surface text-base">Instant Fetch</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Click Download to save the media file directly to your device via high-speed chunk streaming.
          </p>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">quiz</span>
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-surface-container/60 border border-white/5 p-4 rounded-xl space-y-1.5">
              <h4 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {faq.q}
              </h4>
              <p className="text-xs text-on-surface-variant pl-4 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
