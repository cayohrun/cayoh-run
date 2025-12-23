interface CardProps {
  children: React.ReactNode;
  className?: string;
  noHover?: boolean;
}

export const Card = ({ children, className = "", noHover = false }: CardProps) => (
  <div className={`
    relative overflow-hidden rounded-3xl bg-zinc-900/50 border border-white/5
    backdrop-blur-sm p-6 transition-all duration-500
    ${!noHover ? 'hover:border-white/20 hover:bg-zinc-800/50 hover:shadow-2xl hover:shadow-indigo-500/10' : ''}
    ${className}
  `}>
    {children}
  </div>
);
