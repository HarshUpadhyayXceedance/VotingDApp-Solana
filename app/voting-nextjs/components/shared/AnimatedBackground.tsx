'use client';
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Container for all animated orbs */}
      <div className="absolute top-0 left-0 w-full h-full">

        {/* Purple Orb - Top Left */}
        <div
          className="absolute -top-48 -left-24 w-[600px] h-[600px] bg-purple-500 rounded-full opacity-10 dark:opacity-15 blur-3xl animate-float transition-opacity"
          style={{ animationDelay: '0s' }}
        />

        {/* Green Orb - Bottom Right */}
        <div
          className="absolute -bottom-36 -right-36 w-[500px] h-[500px] bg-green-400 rounded-full opacity-10 dark:opacity-15 blur-3xl animate-float transition-opacity"
          style={{ animationDelay: '-5s' }}
        />

        {/* Blue Orb - Middle Right */}
        <div
          className="absolute top-1/2 right-[10%] w-[400px] h-[400px] bg-blue-500 rounded-full opacity-8 dark:opacity-10 blur-3xl animate-float transition-opacity"
          style={{ animationDelay: '-10s' }}
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