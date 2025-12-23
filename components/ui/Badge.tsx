export const Badge = ({
  children,
  color = "zinc"
}: {
  children: React.ReactNode;
  color?: "zinc" | "indigo" | "emerald" | "red";
}) => {
  const colors = {
    zinc: "bg-zinc-800 text-zinc-300 border-zinc-700",
    indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    red: "bg-red-500/10 text-red-300 border-red-500/20",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase border ${colors[color]}`}>
      {children}
    </span>
  );
};
