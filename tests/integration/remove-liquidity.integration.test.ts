import { assert } from "chai";
import { BN, web3 } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  getMint,
} from "@solana/spl-token";

import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
} from "../helpers/token";
import { payer, program, provider } from "../helpers/workspace";

describe("integration: remove liquidity", () => {
  it("adds bootstrap liquidity, mints expected LP shares and then remove it", async () => {
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

    const userLpTokenAccount = await getAccount(
      provider.connection,
      userLpMintAta,
    );

    assert.equal(userLpTokenAccount.amount.toString(), "1000");

    assert.equal(
      userLpTokenAccount.owner
        .toBuffer()
        .compare(provider.wallet.publicKey.toBuffer()),
      0,
    );

    await program.methods
      .removeLiquidity(new BN(500), new BN(500), new BN(500))
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

    const userTokenXAccount = await getAccount(
      provider.connection,
      userTokenXAta,
    );

    const userTokenYAccount = await getAccount(
      provider.connection,
      userTokenYAta,
    );

    const userLpTokenAccountAfter = await getAccount(
      provider.connection,
      userLpMintAta,
    );

    assert.equal(userTokenXAccount.amount.toString(), "500");
    assert.equal(userTokenYAccount.amount.toString(), "500");
    assert.equal(userLpTokenAccountAfter.amount.toString(), "500");
    const vaultXAccount = await getAccount(provider.connection, vaultX);
    const vaultYAccount = await getAccount(provider.connection, vaultY);
    const lpMintAccount = await getMint(provider.connection, lpMint.publicKey);
    assert.equal(vaultXAccount.amount.toString(), "500");
    assert.equal(vaultYAccount.amount.toString(), "500");
    assert.equal(lpMintAccount.supply.toString(), "500");
  });

  it("high slippage", async () => {
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

    const userLpTokenAccount = await getAccount(
      provider.connection,
      userLpMintAta,
    );

    assert.equal(userLpTokenAccount.amount.toString(), "1000");

    assert.equal(
      userLpTokenAccount.owner
        .toBuffer()
        .compare(provider.wallet.publicKey.toBuffer()),
      0,
    );

    const userTokenXBefore = await getAccount(
      provider.connection,
      userTokenXAta,
    );
    const userTokenYBefore = await getAccount(
      provider.connection,
      userTokenYAta,
    );
    const userLpBefore = await getAccount(provider.connection, userLpMintAta);
    const vaultXBefore = await getAccount(provider.connection, vaultX);
    const vaultYBefore = await getAccount(provider.connection, vaultY);
    const lpMintBefore = await getMint(provider.connection, lpMint.publicKey);

    assert.equal(userTokenXBefore.amount.toString(), "0");
    assert.equal(userTokenYBefore.amount.toString(), "0");
    assert.equal(userLpBefore.amount.toString(), "1000");
    assert.equal(vaultXBefore.amount.toString(), "1000");
    assert.equal(vaultYBefore.amount.toString(), "1000");
    assert.equal(lpMintBefore.supply.toString(), "1000");

    let threw = false;

    try {
      await program.methods
        .removeLiquidity(new BN(500), new BN(501), new BN(500))
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

    const userTokenXAccountAfter = await getAccount(
      provider.connection,
      userTokenXAta,
    );

    const userTokenYAccountAfter = await getAccount(
      provider.connection,
      userTokenYAta,
    );

    const userLpTokenAccountAfter = await getAccount(
      provider.connection,
      userLpMintAta,
    );

    const vaultXAccountAfter = await getAccount(provider.connection, vaultX);
    const vaultYAccountAfter = await getAccount(provider.connection, vaultY);
    const lpMintAccountAfter = await getMint(
      provider.connection,
      lpMint.publicKey,
    );

    assert.equal(userTokenXAccountAfter.amount.toString(), "0");
    assert.equal(userTokenYAccountAfter.amount.toString(), "0");
    assert.equal(userLpTokenAccountAfter.amount.toString(), "1000");
    assert.equal(vaultXAccountAfter.amount.toString(), "1000");
    assert.equal(vaultYAccountAfter.amount.toString(), "1000");
    assert.equal(lpMintAccountAfter.supply.toString(), "1000");
  });
});
