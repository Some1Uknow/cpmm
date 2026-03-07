import { Provider, web3 } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { provider } from "./workspace";

export async function createMint(
  _connection: Provider["connection"],
  payer: web3.Keypair,
  mintAuthority: web3.PublicKey,
  freezeAuthority: web3.PublicKey | null,
  decimals: number,
  keypair = web3.Keypair.generate(),
  tokenProgram = TOKEN_PROGRAM_ID,
): Promise<web3.PublicKey> {
  const lamports =
    await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx = new web3.Transaction().add(
    web3.SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: keypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: tokenProgram,
    }),
    createInitializeMintInstruction(
      keypair.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      tokenProgram,
    ),
  );

  await provider.sendAndConfirm!(tx, [payer, keypair]);
  return keypair.publicKey;
}

export async function createAssociatedTokenAccount(
  _connection: Provider["connection"],
  payer: web3.Keypair,
  mint: web3.PublicKey,
  owner: web3.PublicKey,
  _confirmOptions?: unknown,
  tokenProgram = TOKEN_PROGRAM_ID,
  associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID,
): Promise<web3.PublicKey> {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    tokenProgram,
    associatedTokenProgram,
  );

  const tx = new web3.Transaction().add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      owner,
      mint,
      tokenProgram,
      associatedTokenProgram,
    ),
  );

  await provider.sendAndConfirm!(tx, [payer]);
  return ata;
}

export async function mintTo(
  _connection: Provider["connection"],
  payer: web3.Keypair,
  mint: web3.PublicKey,
  destination: web3.PublicKey,
  authority: web3.PublicKey,
  amount: number | bigint,
  _multiSigners: web3.Signer[] = [],
  _confirmOptions?: unknown,
  tokenProgram = TOKEN_PROGRAM_ID,
): Promise<string> {
  if (!authority.equals(provider.wallet.publicKey)) {
    throw new Error("LiteSVM token helper only supports provider wallet as mint authority");
  }

  const tx = new web3.Transaction().add(
    createMintToInstruction(
      mint,
      destination,
      authority,
      amount,
      [],
      tokenProgram,
    ),
  );

  return provider.sendAndConfirm!(tx, [payer]);
}
