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

describe("integration: add_liquidity", () => {
  it("adds bootstrap liquidity and mints LP shares", async () => {
    assert.equal(1, 1);

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

    const userTokenXAta = getAssociatedTokenAddressSync(
      tokenMintX,
      provider.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const userTokenYAta = getAssociatedTokenAddressSync(
      tokenMintY,
      provider.wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    await program.methods
      .addLiquidity(1000, 1000)
      .accountsPartial({
        authority: provider.wallet.publicKey,
        pool: poolPda,
        tokenMintX,
        tokenMintY,
        vaultX,
        vaultY,
        lpMint: lpMint.publicKey,
        userTokenX: userTokenXAta,
        userTokenY: userTokenYAta,
        userLpTokenAta: getAssociatedTokenAddressSync(
          lpMint.publicKey,
          provider.wallet.publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const lpMintInfo = await getMint(provider.connection, lpMint.publicKey);
    assert.equal(lpMintInfo.supply.toString(), "1000");

    const userLpTokenAccount = await getAccount(
      provider.connection,
      getAssociatedTokenAddressSync(
        lpMint.publicKey,
        provider.wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );

    const userXTokenAccount = await getAccount(
      provider.connection,
      userTokenXAta,
    );
    const userYTokenAccount = await getAccount(
      provider.connection,
      userTokenYAta,
    );

    assert.equal(
      userTokenXAta.address.toBuffer().compare(provider.wallet.publicKey),
      0,
    );
    assert.equal(
      userTokenYAta.address.toBuffer().compare(provider.wallet.publicKey),
      0,
    );

    assert.equal(
      userLpTokenAccount.address.toBuffer().compare(provider.wallet.publicKey),
      0,
    );
  });
});
