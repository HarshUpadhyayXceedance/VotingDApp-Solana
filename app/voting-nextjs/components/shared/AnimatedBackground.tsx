'use client';
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Container for all animated orbs */}
      <div className="absolute top-0 left-0 w-full h-full">

        {/* Light mode: Violet/Slate orbs | Dark mode: Purple orbs */}
        {/* Top Left Orb */}
        <div
          className="absolute -top-48 -left-24 w-[600px] h-[600px] rounded-full blur-3xl animate-float transition-all duration-500 bg-violet-400 opacity-20 dark:bg-purple-500 dark:opacity-15"
          style={{ animationDelay: '0s' }}
        />

        {/* Bottom Right Orb */}
        <div
          className="absolute -bottom-36 -right-36 w-[500px] h-[500px] rounded-full blur-3xl animate-float transition-all duration-500 bg-indigo-300 opacity-20 dark:bg-green-400 dark:opacity-15"
          style={{ animationDelay: '-5s' }}
        />

        {/* Middle Right Orb */}
        <div
          className="absolute top-1/2 right-[10%] w-[400px] h-[400px] rounded-full blur-3xl animate-float transition-all duration-500 bg-purple-300 opacity-15 dark:bg-blue-500 dark:opacity-10"
          style={{ animationDelay: '-10s' }}
        />

        {/* Additional light mode orb */}
        <div
          className="absolute top-1/4 left-1/3 w-[350px] h-[350px] rounded-full blur-3xl animate-float transition-all duration-500 bg-fuchsia-200 opacity-15 dark:bg-transparent dark:opacity-0"
          style={{ animationDelay: '-7s' }}
        />
      </div>

      {/* Scoped styles for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(50px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-30px, 50px) scale(0.9);
          }
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}