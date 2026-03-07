import { assert } from "chai";
import { program, provider, payer } from "../helpers/workspace";
import { web3 } from "@coral-xyz/anchor";
import {
  createMint,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getMint,
} from "@solana/spl-token";

describe("integration: initialize_pool", () => {
  it("initialize pool and store its state", async () => {
    const feeBps = 30;
    assert.equal(feeBps, 30);

    const mintA = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      9,
    );

    const mintB = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      9,
    );

    let tokenMintX = mintA;
    let tokenMintY = mintB;
    if (mintA.toBuffer().compare(mintB.toBuffer()) > 0) {
      tokenMintX = mintB;
      tokenMintY = mintA;
    }

    const [poolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMintX.toBuffer(), tokenMintY.toBuffer()],
      program.programId,
    );

    const vaultX = getAssociatedTokenAddressSync(
      tokenMintX,
      poolPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const vaultY = getAssociatedTokenAddressSync(
      tokenMintY,
      poolPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const lpMint = web3.Keypair.generate();

    await program.methods
      .initializePool(feeBps)
      .accountsPartial({
        authority: provider.wallet.publicKey,
        tokenMintX,
        tokenMintY,
        vaultX,
        vaultY,
        lpMint: lpMint.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([lpMint, payer])
      .rpc();

    const poolState = await program.account.pool.fetch(poolPda);

    assert.equal(poolState.feeBps, feeBps);
    assert.equal(
      poolState.authority
        .toBuffer()
        .compare(provider.wallet.publicKey.toBuffer()),
      0,
    );
    assert.equal(
      poolState.tokenMintX.toBuffer().compare(tokenMintX.toBuffer()),
      0,
    );
    assert.equal(
      poolState.tokenMintY.toBuffer().compare(tokenMintY.toBuffer()),
      0,
    );
    assert.equal(
      poolState.lpMint.toBuffer().compare(lpMint.publicKey.toBuffer()),
      0,
    );
    assert.equal(poolState.vaultX.toBuffer().compare(vaultX.toBuffer()), 0);
    assert.equal(poolState.vaultY.toBuffer().compare(vaultY.toBuffer()), 0);

    const vaultXAccount = await getAccount(provider.connection, vaultX);
    const vaultYAccount = await getAccount(provider.connection, vaultY);
    const lpMintAccount = await getMint(provider.connection, lpMint.publicKey);

    assert.equal(vaultXAccount.owner.toBuffer().compare(poolPda.toBuffer()), 0);
    assert.equal(
      vaultXAccount.mint.toBuffer().compare(tokenMintX.toBuffer()),
      0,
    );
    assert.equal(vaultYAccount.owner.toBuffer().compare(poolPda.toBuffer()), 0);
    assert.equal(
      vaultYAccount.mint.toBuffer().compare(tokenMintY.toBuffer()),
      0,
    );

    assert.isNotNull(lpMintAccount.mintAuthority);
    assert.equal(
      lpMintAccount.mintAuthority!.toBuffer().compare(poolPda.toBuffer()),
      0,
    );

    assert.isNull(lpMintAccount.freezeAuthority);
  });

  it("rejects non-canonical mint order", async () => {
    const feeBps = 30;

    const mintA = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      9,
    );

    const mintB = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      9,
    );

    let greaterMint = mintA;
    let smallerMint = mintB;

    if (mintA.toBuffer().compare(mintB.toBuffer()) < 0) {
      greaterMint = mintB;
      smallerMint = mintA;
    }

    const [wrongPoolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), greaterMint.toBuffer(), smallerMint.toBuffer()],
      program.programId,
    );

    const wrongVaultX = getAssociatedTokenAddressSync(
      greaterMint,
      wrongPoolPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const wrongVaultY = getAssociatedTokenAddressSync(
      smallerMint,
      wrongPoolPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const lpMint = web3.Keypair.generate();

    let threw = false;

    try {
      await program.methods
        .initializePool(feeBps)
        .accountsPartial({
          authority: provider.wallet.publicKey,
          tokenMintX: greaterMint,
          tokenMintY: smallerMint,
          pool: wrongPoolPda,
          vaultX: wrongVaultX,
          vaultY: wrongVaultY,
          lpMint: lpMint.publicKey,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([lpMint, payer])
        .rpc();
    } catch {
      threw = true;
    }

    assert.equal(threw, true);
  });

  it("rejects wrong fee tier", async () => {
    const feeBps = 25;

    const mintA = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      9,
    );

    const mintB = await createMint(
      provider.connection,
      payer,
      provider.wallet.publicKey,
      null,
      9,
    );

    let tokenMintX = mintA;
    let tokenMintY = mintB;
    if (mintA.toBuffer().compare(mintB.toBuffer()) > 0) {
      tokenMintX = mintB;
      tokenMintY = mintA;
    }

    const [poolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMintX.toBuffer(), tokenMintY.toBuffer()],
      program.programId,
    );

    const vaultX = getAssociatedTokenAddressSync(
      tokenMintX,
      poolPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const vaultY = getAssociatedTokenAddressSync(
      tokenMintY,
      poolPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const lpMint = web3.Keypair.generate();

    let threw = false;

    try {
      await program.methods
        .initializePool(feeBps)
        .accountsPartial({
          authority: provider.wallet.publicKey,
          tokenMintX,
          tokenMintY,
          pool: poolPda,
          vaultX,
          vaultY,
          lpMint: lpMint.publicKey,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([lpMint, payer])
        .rpc();
    } catch {
      threw = true;
    }

    assert.equal(threw, true);
  });
});
