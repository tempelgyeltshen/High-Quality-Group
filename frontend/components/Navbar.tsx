import { ShieldCheck, User as UserIcon, LogOut, Star } from 'lucide-react';
import { User } from '../types';
// @ts-ignore
import logoImg from '../assets/images/Logo.svg';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  return (
    <header className="bg-[#B25712] flex justify-between items-center px-6 shadow-md z-10 h-16 select-none border-b border-amber-100/20">
      {/* Left side: Logo and company branding */}
      <div className="flex items-center gap-3">
        {/* Real Five Gold Stars logo container from assets */}
        <div className="bg-white w-11 h-11 rounded-xl border border-amber-100/10 flex items-center justify-center shadow-md hover:scale-[1.05] transition-all duration-200 p-1.5 shrink-0">
          <img 
            src={logoImg} 
            className="w-full h-full object-contain rounded-lg" 
            alt="HQ Group Logo" 
            referrerPolicy="no-referrer" 
          />
        </div>
        <div className="text-left">
          <h1 className="text-white font-black text-sm tracking-tight uppercase leading-none">
            High Quality Group
          </h1>
          <span className="text-[9px] text-[#FCC923] font-mono font-bold leading-tight block mt-1 uppercase tracking-wider">
            Quality Hardware & Retail Solutions &bull; Thimphu, Bhutan
          </span>
        </div>
      </div>

      {/* Right side: Logged in badge with beautiful, modern pill style and a dedicated Log Out button */}
      <div className="flex items-center gap-3">
        {currentUser && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-bold gap-2 shadow-inner">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>
                User: <span className="text-[#FCC923] font-extrabold">{currentUser.username}</span>
              </span>
              <span className="text-white/30">|</span>
              <span className="text-[9px] uppercase tracking-wider text-white font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">
                {currentUser.role}
              </span>
            </div>
            
            <button 
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all duration-150 border border-white/10 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98]"
              title="Click to logout of station"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

