use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Token mints must be different")]
    IdenticalMints,
    #[msg("Mint order must be canonical: mint_x < mint_y")]
    NonCanonicalMintOrder,
    #[msg("Fee tier is not allowed")]
    InvalidFeeTier,
}
