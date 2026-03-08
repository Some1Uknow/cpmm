import { assert } from "chai";
import { BN, web3 } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
} from "../helpers/token";
import { payer, program, provider } from "../helpers/workspace";

describe("integration: swap", () => {
  it("swaps exact input from token x to token y", async () => {
    const feeBps = 30;
    const bootstrapTokenXIn = 1_000;
    const bootstrapTokenYIn = 1_000;
    const bootstrapMinLpOut = 1_000;

    const swapAmountIn = 100;
    const minAmountOut = 1;

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
      bootstrapTokenXIn + swapAmountIn,
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
      bootstrapTokenYIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await program.methods
      .addLiquidity(
        new BN(bootstrapTokenXIn),
        new BN(bootstrapTokenYIn),
        new BN(bootstrapMinLpOut),
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

    const userInputBefore = await getAccount(
      provider.connection,
      userTokenXAta,
    );
    const userOutputBefore = await getAccount(
      provider.connection,
      userTokenYAta,
    );
    const inputVaultBefore = await getAccount(provider.connection, vaultX);
    const outputVaultBefore = await getAccount(provider.connection, vaultY);

    assert.equal(userInputBefore.amount.toString(), "100");
    assert.equal(userOutputBefore.amount.toString(), "0");
    assert.equal(inputVaultBefore.amount.toString(), "1000");
    assert.equal(outputVaultBefore.amount.toString(), "1000");

    await program.methods
      .swap(new BN(swapAmountIn), new BN(minAmountOut))
      .accountsPartial({
        signer: provider.wallet.publicKey,
        tokenMintX,
        tokenMintY,
        pool: poolPda,
        inputVault: vaultX,
        outputVault: vaultY,
        inputTokenMint: tokenMintX,
        outputTokenMint: tokenMintY,
        userInputAta: userTokenXAta,
        userOutputAta: userTokenYAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const userInputAfter = await getAccount(provider.connection, userTokenXAta);
    const userOutputAfter = await getAccount(
      provider.connection,
      userTokenYAta,
    );
    const inputVaultAfterSwap = await getAccount(provider.connection, vaultX);
    const outputVaultAfterSwap = await getAccount(provider.connection, vaultY);

    assert.equal(userInputAfter.amount.toString(), "0");
    assert.equal(userOutputAfter.amount.toString(), "90");
    assert.equal(inputVaultAfterSwap.amount.toString(), "1100");
    assert.equal(outputVaultAfterSwap.amount.toString(), "910");
  });

  it("swaps exact input from token y to token x", async () => {
    const feeBps = 30;
    const bootstrapTokenXIn = 1_000;
    const bootstrapTokenYIn = 1_000;
    const bootstrapMinLpOut = 1_000;

    const swapAmountIn = 100;
    const minAmountOut = 1;

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
      bootstrapTokenXIn + swapAmountIn,
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
      bootstrapTokenYIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await program.methods
      .addLiquidity(
        new BN(bootstrapTokenXIn),
        new BN(bootstrapTokenYIn),
        new BN(bootstrapMinLpOut),
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

    const userInputBefore = await getAccount(
      provider.connection,
      userTokenXAta,
    );
    const userOutputBefore = await getAccount(
      provider.connection,
      userTokenYAta,
    );
    const inputVaultBefore = await getAccount(provider.connection, vaultX);
    const outputVaultBefore = await getAccount(provider.connection, vaultY);

    assert.equal(userInputBefore.amount.toString(), "100");
    assert.equal(userOutputBefore.amount.toString(), "0");
    assert.equal(inputVaultBefore.amount.toString(), "1000");
    assert.equal(outputVaultBefore.amount.toString(), "1000");

    await program.methods
      .swap(new BN(swapAmountIn), new BN(minAmountOut))
      .accountsPartial({
        signer: provider.wallet.publicKey,
        tokenMintX,
        tokenMintY,
        pool: poolPda,
        inputVault: vaultX,
        outputVault: vaultY,
        inputTokenMint: tokenMintX,
        outputTokenMint: tokenMintY,
        userInputAta: userTokenXAta,
        userOutputAta: userTokenYAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const userInputAfter = await getAccount(provider.connection, userTokenXAta);
    const userOutputAfter = await getAccount(
      provider.connection,
      userTokenYAta,
    );
    const inputVaultAfterSwap = await getAccount(provider.connection, vaultX);
    const outputVaultAfterSwap = await getAccount(provider.connection, vaultY);

    assert.equal(userInputAfter.amount.toString(), "0");
    assert.equal(userOutputAfter.amount.toString(), "90");
    assert.equal(inputVaultAfterSwap.amount.toString(), "1100");
    assert.equal(outputVaultAfterSwap.amount.toString(), "910");
  });

  it("swap fails when minimum amount out is set too high", async () => {
    const feeBps = 30;
    const bootstrapTokenXIn = 1_000;
    const bootstrapTokenYIn = 1_000;
    const bootstrapMinLpOut = 1_000;

    const swapAmountIn = 100;
    const minAmountOut = 91;

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
      bootstrapTokenXIn + swapAmountIn,
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
      bootstrapTokenYIn,
      [],
      undefined,
      TOKEN_PROGRAM_ID,
    );

    await program.methods
      .addLiquidity(
        new BN(bootstrapTokenXIn),
        new BN(bootstrapTokenYIn),
        new BN(bootstrapMinLpOut),
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

    const userInputBefore = await getAccount(
      provider.connection,
      userTokenXAta,
    );
    const userOutputBefore = await getAccount(
      provider.connection,
      userTokenYAta,
    );
    const inputVaultBefore = await getAccount(provider.connection, vaultX);
    const outputVaultBefore = await getAccount(provider.connection, vaultY);

    assert.equal(userInputBefore.amount.toString(), "100");
    assert.equal(userOutputBefore.amount.toString(), "0");
    assert.equal(inputVaultBefore.amount.toString(), "1000");
    assert.equal(outputVaultBefore.amount.toString(), "1000");

    let threw = false;

    try {
      await program.methods
        .swap(new BN(swapAmountIn), new BN(minAmountOut))
        .accountsPartial({
          signer: provider.wallet.publicKey,
          tokenMintX,
          tokenMintY,
          pool: poolPda,
          inputVault: vaultX,
          outputVault: vaultY,
          inputTokenMint: tokenMintX,
          outputTokenMint: tokenMintY,
          userInputAta: userTokenXAta,
          userOutputAta: userTokenYAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();
    } catch {
      threw = true;
    }

    assert.equal(threw, true);

    const userInputAfter = await getAccount(provider.connection, userTokenXAta);
    const userOutputAfter = await getAccount(
      provider.connection,
      userTokenYAta,
    );
    const inputVaultAfterSwap = await getAccount(provider.connection, vaultX);
    const outputVaultAfterSwap = await getAccount(provider.connection, vaultY);

    assert.equal(userInputAfter.amount.toString(), "100");
    assert.equal(userOutputAfter.amount.toString(), "0");
    assert.equal(inputVaultAfterSwap.amount.toString(), "1000");
    assert.equal(outputVaultAfterSwap.amount.toString(), "1000");
  });
});
