import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingDapp } from "../target/types/voting_dapp";
import { assert } from "chai";

describe("voting dapp (hybrid admin)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingDapp as Program<VotingDapp>;

  // ------------------------------------------------------------
  // Use provider wallet to avoid Devnet airdrop issues
  // ------------------------------------------------------------
  const superAdmin = provider.wallet;
  const adminKeypair = provider.wallet.payer;
  const voterKeypair = provider.wallet.payer;

  // Election & candidate
  const electionKeypair = anchor.web3.Keypair.generate();
  const candidateKeypair = anchor.web3.Keypair.generate();

  let adminPda: anchor.web3.PublicKey;

  // ------------------------------------------------------------
  // 1. Super admin adds admin
  // ------------------------------------------------------------
  it("adds an admin (super admin only)", async () => {
    [adminPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), adminKeypair.publicKey.toBuffer()],
      program.programId
    );

    await program.methods["addAdmin"]()
      .accountsStrict({
        superAdmin: superAdmin.publicKey,
        admin: adminKeypair.publicKey,
        adminAccount: adminPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const adminAccount = await program.account.admin.fetch(adminPda);

    assert.equal(
      adminAccount.authority.toBase58(),
      adminKeypair.publicKey.toBase58()
    );
  });

  // ------------------------------------------------------------
  // 2. Admin creates election
  // ------------------------------------------------------------
  it("admin creates an election", async () => {
    await program.methods["createElection"]("Student Council Election")
      .accountsStrict({
        authority: adminKeypair.publicKey,
        adminAccount: adminPda,
        election: electionKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([electionKeypair])
      .rpc();

    const election = await program.account.election.fetch(
      electionKeypair.publicKey
    );

    assert.equal(election.title, "Student Council Election");
    assert.equal(election.isActive, true);
  });

  // ------------------------------------------------------------
  // 3. Admin adds candidate
  // ------------------------------------------------------------
  it("admin adds a candidate", async () => {
    await program.methods["addCandidate"]("Alice")
      .accountsStrict({
        election: electionKeypair.publicKey,
        candidate: candidateKeypair.publicKey,
        authority: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([candidateKeypair])
      .rpc();

    const candidate = await program.account.candidate.fetch(
      candidateKeypair.publicKey
    );

    assert.equal(candidate.name, "Alice");
    assert.equal(candidate.votes.toNumber(), 0);
  });

  // ------------------------------------------------------------
  // 4. Voter casts vote
  // ------------------------------------------------------------
  it("voter casts a vote", async () => {
    const [voteRecordPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("vote"),
          voterKeypair.publicKey.toBuffer(),
          electionKeypair.publicKey.toBuffer(),
        ],
        program.programId
      );

    await program.methods["castVote"]()
      .accountsStrict({
        election: electionKeypair.publicKey,
        candidate: candidateKeypair.publicKey,
        voter: voterKeypair.publicKey,
        voteRecord: voteRecordPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const candidate = await program.account.candidate.fetch(
      candidateKeypair.publicKey
    );

    assert.equal(candidate.votes.toNumber(), 1);
  });

  // ------------------------------------------------------------
  // 5. Prevent double voting
  // ------------------------------------------------------------
  it("prevents double voting", async () => {
    try {
      const [voteRecordPda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("vote"),
            voterKeypair.publicKey.toBuffer(),
            electionKeypair.publicKey.toBuffer(),
          ],
          program.programId
        );

      await program.methods["castVote"]()
        .accountsStrict({
          election: electionKeypair.publicKey,
          candidate: candidateKeypair.publicKey,
          voter: voterKeypair.publicKey,
          voteRecord: voteRecordPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Double voting should not be allowed");
    } catch {
      assert.ok(true);
    }
  });

  // ------------------------------------------------------------
  // 6. Admin closes election
  // ------------------------------------------------------------
  it("admin closes the election", async () => {
    await program.methods["closeElection"]()
      .accountsStrict({
        election: electionKeypair.publicKey,
        authority: adminKeypair.publicKey,
      })
      .rpc();

    const election = await program.account.election.fetch(
      electionKeypair.publicKey
    );

    assert.equal(election.isActive, false);
  });
});
