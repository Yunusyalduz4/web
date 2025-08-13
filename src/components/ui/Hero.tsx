import { ReactNode } from 'react';

export default function Hero({
  title,
  right,
  gradient = 'from-rose-600 via-fuchsia-600 to-indigo-600',
  children,
}: {
  title: string;
  right?: ReactNode;
  gradient?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] ${gradient} opacity-90`} />
      <div className="relative px-4 pt-6 pb-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {right}
        </div>
        {children}
      </div>
    </div>
  );
}


