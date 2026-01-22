import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Voting } from "../target/types/voting";
import { assert } from "chai";

describe("voting dapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Voting as Program<Voting>;
  const authority = provider.wallet;

  const electionKeypair = anchor.web3.Keypair.generate();
  const candidateKeypair = anchor.web3.Keypair.generate();

  it("creates an election", async () => {
    await program.methods
      .createElection("Student Council Election")
      .accounts({
        election: electionKeypair.publicKey,
        authority: authority.publicKey,
      })
      .signers([electionKeypair])
      .rpc();

    const election = await program.account.election.fetch(
      electionKeypair.publicKey
    );

    assert.equal(election.title, "Student Council Election");
    assert.equal(election.isActive, true);
  });

  it("adds a candidate", async () => {
    await program.methods
      .addCandidate("Alice")
      .accounts({
        election: electionKeypair.publicKey,
        candidate: candidateKeypair.publicKey,
      })
      .signers([candidateKeypair])
      .rpc();

    const candidate = await program.account.candidate.fetch(
      candidateKeypair.publicKey
    );

    assert.equal(candidate.name, "Alice");
    assert.equal(candidate.votes.toNumber(), 0);
  });

  it("casts a vote", async () => {
    await program.methods
      .castVote()
      .accounts({
        election: electionKeypair.publicKey,
        candidate: candidateKeypair.publicKey,
        voter: authority.publicKey,
      })
      .rpc();

    const candidate = await program.account.candidate.fetch(
      candidateKeypair.publicKey
    );

    assert.equal(candidate.votes.toNumber(), 1);
  });

  it("prevents double voting", async () => {
    try {
      await program.methods
        .castVote()
        .accounts({
          election: electionKeypair.publicKey,
          candidate: candidateKeypair.publicKey,
          voter: authority.publicKey,
        })
        .rpc();

      assert.fail("Double voting should not be allowed");
    } catch {
      assert.ok(true);
    }
  });

  it("closes the election", async () => {
    await program.methods
      .closeElection()
      .accounts({
        election: electionKeypair.publicKey,
      })
      .rpc();

    const election = await program.account.election.fetch(
      electionKeypair.publicKey
    );

    assert.equal(election.isActive, false);
  });
});
