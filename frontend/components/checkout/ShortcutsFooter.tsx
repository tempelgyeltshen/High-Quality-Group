const SHORTCUTS = [
  { keys: 'Alt + S', label: 'New Sale Scan', highlight: false },
  { keys: 'Alt + T', label: 'Sales Return', highlight: false },
  { keys: 'Ctrl + H', label: 'Hold Cart', highlight: false },
  { keys: 'F10', label: 'Complete Trans', highlight: true },
  { keys: 'ESC', label: 'Logout Session', highlight: false },
];

/** Bottom status ribbon listing register keyboard shortcuts. */
export default function ShortcutsFooter() {
  return (
    <footer className="bg-[#2F2F2F] mt-6 px-6 py-3 rounded-xl flex flex-wrap items-center justify-between text-[11px] font-bold text-[#FEF7E5]/80 border border-slate-700/45 shadow-lg select-none">
      <div className="flex flex-wrap items-center gap-5">
        {SHORTCUTS.map(({ keys, label, highlight }) => (
          <div key={keys} className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-md font-mono text-[9px] shadow-sm ${
                highlight
                  ? 'bg-[#FCC923] text-[#2F2F2F] border border-amber-500/20 font-black'
                  : 'bg-[#FEF7E5]/10 text-[#FCC923] border border-slate-700'
              }`}
            >
              {keys}
            </span>
            <span className={highlight ? 'text-[#FCC923] font-bold' : 'text-slate-200'}>{label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
        <span>Active Scanner Status:</span>
        <span className="px-2 py-0.5 bg-slate-800 text-emerald-400 rounded-md font-bold animate-pulse border border-emerald-950/20 text-[9px] uppercase tracking-wide">
          AUTO-SCAN READY
        </span>
      </div>
    </footer>
  );
}
