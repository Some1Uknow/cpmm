import { assert } from "chai";
import { program, provider, payer } from "../helpers/workspace";
import { web3, BN } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
  mintTo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("integration: add_liquidity", () => {
  it("adds bootstrap liquidity and mints expected LP shares", async () => {
    const feeBps = 30;
    const maxTokenXIn = 1_000;
    const maxTokenYIn = 1_000;
    const minLpSharesOut = 1_000;

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

    const userTokenXAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenMintX,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const userTokenYAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenMintY,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const userLpMintAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      lpMint.publicKey,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    await mintTo(
      provider.connection,
      payer,
      tokenMintX,
      userTokenXAta,
      provider.wallet.publicKey,
      maxTokenXIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await mintTo(
      provider.connection,
      payer,
      tokenMintY,
      userTokenYAta,
      provider.wallet.publicKey,
      maxTokenYIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    const userXBefore = await getAccount(provider.connection, userTokenXAta);
    const userYBefore = await getAccount(provider.connection, userTokenYAta);
    const vaultXBefore = await getAccount(provider.connection, vaultX);
    const vaultYBefore = await getAccount(provider.connection, vaultY);

    await program.methods
      .addLiquidity(
        new BN(maxTokenXIn),
        new BN(maxTokenYIn),
        new BN(minLpSharesOut),
      )
      .accountsPartial({
        signer: provider.wallet.publicKey,
        pool: poolPda,
        tokenMintX,
        tokenMintY,
        vaultX,
        vaultY,
        lpMint: lpMint.publicKey,
        userTokenXAta,
        userTokenYAta,
        userLpMintAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const lpMintInfo = await getMint(provider.connection, lpMint.publicKey);
    const userLpTokenAccount = await getAccount(
      provider.connection,
      userLpMintAta,
    );
    const userXAfter = await getAccount(provider.connection, userTokenXAta);
    const userYAfter = await getAccount(provider.connection, userTokenYAta);
    const vaultXAfter = await getAccount(provider.connection, vaultX);
    const vaultYAfter = await getAccount(provider.connection, vaultY);

    assert.equal(lpMintInfo.supply.toString(), "1000");
    assert.equal(userLpTokenAccount.amount.toString(), "1000");
    assert.equal(userXBefore.amount.toString(), "1000");
    assert.equal(userYBefore.amount.toString(), "1000");
    assert.equal(userXAfter.amount.toString(), "0");
    assert.equal(userYAfter.amount.toString(), "0");
    assert.equal(vaultXBefore.amount.toString(), "0");
    assert.equal(vaultYBefore.amount.toString(), "0");
    assert.equal(vaultXAfter.amount.toString(), "1000");
    assert.equal(vaultYAfter.amount.toString(), "1000");
    assert.equal(
      userLpTokenAccount.owner
        .toBuffer()
        .compare(provider.wallet.publicKey.toBuffer()),
      0,
    );
  });

  it("rejects bootstrap add liquidity when min LP out exceeds minted shares", async () => {
    const feeBps = 30;
    const maxTokenXIn = 1_000;
    const maxTokenYIn = 1_000;
    const minLpSharesOut = 1_001;

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

    const userTokenXAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenMintX,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const userTokenYAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenMintY,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const userLpMintAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      lpMint.publicKey,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    await mintTo(
      provider.connection,
      payer,
      tokenMintX,
      userTokenXAta,
      provider.wallet.publicKey,
      maxTokenXIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await mintTo(
      provider.connection,
      payer,
      tokenMintY,
      userTokenYAta,
      provider.wallet.publicKey,
      maxTokenYIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    let threw = false;

    try {
      await program.methods
        .addLiquidity(
          new BN(maxTokenXIn),
          new BN(maxTokenYIn),
          new BN(minLpSharesOut),
        )
        .accountsPartial({
          signer: provider.wallet.publicKey,
          pool: poolPda,
          tokenMintX,
          tokenMintY,
          vaultX,
          vaultY,
          lpMint: lpMint.publicKey,
          userTokenXAta,
          userTokenYAta,
          userLpMintAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();
    } catch {
      threw = true;
    }

    const lpMintInfo = await getMint(provider.connection, lpMint.publicKey);
    const userLpTokenAccount = await getAccount(
      provider.connection,
      userLpMintAta,
    );
    const vaultXAccount = await getAccount(provider.connection, vaultX);
    const vaultYAccount = await getAccount(provider.connection, vaultY);
    const userXAccount = await getAccount(provider.connection, userTokenXAta);
    const userYAccount = await getAccount(provider.connection, userTokenYAta);

    assert.equal(threw, true);
    assert.equal(lpMintInfo.supply.toString(), "0");
    assert.equal(userLpTokenAccount.amount.toString(), "0");
    assert.equal(vaultXAccount.amount.toString(), "0");
    assert.equal(vaultYAccount.amount.toString(), "0");
    assert.equal(userXAccount.amount.toString(), "1000");
    assert.equal(userYAccount.amount.toString(), "1000");
  });

  it("adds non-bootstrap liquidity in pool ratio and mints proportional LP shares", async () => {
    const feeBps = 30;
    const maxTokenXIn = 1_000;
    const maxTokenYIn = 1_000;
    const minLpSharesOut = 1_000;

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

    const userTokenXAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenMintX,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const userTokenYAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenMintY,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const userLpMintAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      lpMint.publicKey,
      provider.wallet.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    await mintTo(
      provider.connection,
      payer,
      tokenMintX,
      userTokenXAta,
      provider.wallet.publicKey,
      maxTokenXIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await mintTo(
      provider.connection,
      payer,
      tokenMintY,
      userTokenYAta,
      provider.wallet.publicKey,
      maxTokenYIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await program.methods
      .addLiquidity(
        new BN(maxTokenXIn),
        new BN(maxTokenYIn),
        new BN(minLpSharesOut),
      )
      .accountsPartial({
        signer: provider.wallet.publicKey,
        pool: poolPda,
        tokenMintX,
        tokenMintY,
        vaultX,
        vaultY,
        lpMint: lpMint.publicKey,
        userTokenXAta,
        userTokenYAta,
        userLpMintAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // adding non bootstrap liquidity in same ratio should succeed and mint correct amount of LP shares

    await mintTo(
      provider.connection,
      payer,
      tokenMintX,
      userTokenXAta,
      provider.wallet.publicKey,
      500,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await mintTo(
      provider.connection,
      payer,
      tokenMintY,
      userTokenYAta,
      provider.wallet.publicKey,
      500,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await program.methods
      .addLiquidity(new BN(500), new BN(500), new BN(500))
      .accountsPartial({
        signer: provider.wallet.publicKey,
        pool: poolPda,
        tokenMintX,
        tokenMintY,
        vaultX,
        vaultY,
        lpMint: lpMint.publicKey,
        userTokenXAta,
        userTokenYAta,
        userLpMintAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const vaultXAccount = await getAccount(provider.connection, vaultX);
    const vaultYAccount = await getAccount(provider.connection, vaultY);
    const lpMintInfo = await getMint(provider.connection, lpMint.publicKey);
    assert.equal(lpMintInfo.supply.toString(), "1500");
    assert.equal(vaultXAccount.amount.toString(), "1500");
    assert.equal(vaultYAccount.amount.toString(), "1500");
    const userLpTokenAccount = await getAccount(
      provider.connection,
      userLpMintAta,
    );
    assert.equal(userLpTokenAccount.amount.toString(), "1500");
  });
});
