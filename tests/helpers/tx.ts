import { AnchorProvider } from "@coral-xyz/anchor";

export async function confirmTx(
    provider: AnchorProvider,
    signature: string,
): Promise<void> {
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
        {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
    );
}

