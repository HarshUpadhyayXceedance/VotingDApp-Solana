'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SUPER_ADMIN, ADMIN_SEED } from '@/lib/constants';
import { useProgram } from '@/hooks/useProgram';
import { PublicKey } from '@solana/web3.js';

export default function Landing() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const program = useProgram();

  useEffect(() => {
    if (publicKey && program) {
      // Check if user is admin
      checkRole();
    }
  }, [publicKey, program]);

const checkRole = async () => {
  if (!publicKey || !program) return;

  // Super admin shortcut
  if (publicKey.equals(SUPER_ADMIN)) {
    router.push('/admin');
    return;
  }

  try {
    const [adminPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(ADMIN_SEED), publicKey.toBuffer()],
      program.programId
    );

    // 👇 Correct account name
    await program.account.adminAccount.fetch(adminPda);

    router.push('/admin');
  } catch {
    router.push('/elections');
  }
};

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-green-400 bg-clip-text text-transparent">
            SolVote
          </div>
          <WalletMultiButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-6xl font-bold mb-6">
          Democracy at the
          <span className="bg-gradient-to-r from-purple-500 to-green-400 bg-clip-text text-transparent">
            {' '}Speed of Light
          </span>
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          Experience the future of governance with lightning-fast, transparent,
          and tamper-proof voting on the Solana blockchain.
        </p>
        <div className="flex gap-4 justify-center">
          <WalletMultiButton />
        </div>
      </main>
    </div>
  );
}