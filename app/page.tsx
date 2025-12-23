'use client';

import { InteractiveGrid } from '@/components/InteractiveGrid';
import { TimeWidget } from '@/components/TimeWidget';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { VidCastWidget } from '@/widgets/vidcast/VidCastWidget';
import {
  Github,
  Terminal,
  Activity,
  Layers,
  Command
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen text-zinc-200 font-sans selection:bg-indigo-500/30 selection:text-white">
      <InteractiveGrid />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-4 sm:p-8 md:p-12 lg:p-20">

        {/* Header Section */}
        <header className="mb-12 md:mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-4">
              cayoh<span className="text-indigo-500">.</span>run
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl font-light tracking-wide">
              PLAYGROUND
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 border border-zinc-800 px-3 py-1.5 rounded-full bg-zinc-900/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              V1.0.0 STABLE
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Left column */}
          <div className="contents md:flex md:flex-col md:gap-4">
            {/* 1. VidCast Widget (主要功能) */}
            <Card className="order-1 md:order-none min-h-[360px] group border-zinc-800 flex flex-col justify-between">
              <VidCastWidget />
            </Card>

            {/* 6. Bento Grid 說明 */}
            <Card className="order-3 md:order-none flex flex-row items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <Layers size={20} className="text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Bento Grid Layout</h3>
                  <p className="text-zinc-500 text-xs mt-1">Responsive, Dark Mode, Interactive.</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-xs text-zinc-400 font-mono border border-zinc-700/50">
                <Command size={12} />
                <span>K</span>
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="order-2 md:order-none grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-auto items-start content-start">
            {/* 2. Time Widget */}
            <Card className="bg-zinc-900/80 self-start">
              <TimeWidget />
            </Card>

            {/* 3. GitHub Link */}
            <Card className="group cursor-pointer self-start">
              <div className="flex flex-col items-center gap-3">
                <Github size={32} className="text-zinc-400 group-hover:text-white transition-colors" />
                <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300">@cayoh</span>
              </div>
            </Card>

            {/* 4. Terminal (CLI 模擬介面) */}
            <Card className="bg-black border-zinc-800">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <div className="font-mono text-xs text-zinc-500 space-y-2 flex-1 overflow-hidden">
                  <p><span className="text-green-500">➜</span> ~ init project</p>
                  <p className="text-zinc-600">Loading modules...</p>
                  <p className="text-zinc-600">Importing designs...</p>
                  <p><span className="text-indigo-400">?</span> Type: Widget</p>
                  <p className="text-zinc-400">Loaded: VidCast.tsx</p>
                  <div className="animate-pulse mt-4">_</div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-xs text-zinc-600 font-mono">CLI MODE</span>
                  <Terminal size={14} className="text-zinc-600" />
                </div>
              </div>
            </Card>

            {/* 5. Firebase Stack */}
            <Card className="group self-start">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between">
                  <Activity size={20} className="text-emerald-500/80" />
                  <Badge color="zinc">Stack</Badge>
                </div>
                <div>
                  <div className="text-lg font-medium text-white group-hover:text-emerald-400 transition-colors">
                    Firebase
                  </div>
                  <div className="text-xs text-zinc-500">Auth & DB Connected</div>
                </div>
              </div>
            </Card>
          </div>

        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/5 pt-8 flex justify-between items-center text-zinc-600 text-sm">
          <p>© 2025 Cayoh. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-zinc-400 cursor-pointer transition-colors">Email</span>
            <span className="hover:text-zinc-400 cursor-pointer transition-colors">Twitter</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
