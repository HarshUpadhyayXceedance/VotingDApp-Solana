import { Injectable } from '@angular/core';
import { PublicKey } from '@solana/web3.js';
import { SolanaService } from '../services/solana.service';
import { SUPER_ADMIN_PUBLIC_KEY, ADMIN_SEED } from './constant';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'VOTER';

@Injectable({ providedIn: 'root' })
export class RoleService {
  constructor(private solana: SolanaService) {}

  async resolveRole(walletPubkey: PublicKey): Promise<UserRole> {
    // 1️⃣ Super admin check
    if (walletPubkey.equals(SUPER_ADMIN_PUBLIC_KEY)) {
      return 'SUPER_ADMIN';
    }

    // 2️⃣ Check Admin PDA
    const program = await this.solana.getProgram();
    if (!program) return 'VOTER';

    const [adminPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(ADMIN_SEED),
        walletPubkey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.account.admin.fetch(adminPda);
      return 'ADMIN';
    } catch {
      return 'VOTER';
    }
  }
}
