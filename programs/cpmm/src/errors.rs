use anchor_lang::prelude::*;

#[error_code]
pub enum CpmmError {
    #[msg("Token mints must be different")]
    IdenticalMints,
    #[msg("Mint order must be canonical: mint_x < mint_y")]
    NonCanonicalMintOrder,
}
