use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Token mints must be different")]
    IdenticalMints,
    #[msg("Mint order must be canonical: mint_x < mint_y")]
    NonCanonicalMintOrder,
    #[msg("Fee tier is not allowed")]
    InvalidFeeTier,
    #[msg("Vault owner must be the pool PDA")]
    InvalidVaultOwner,
    #[msg("Vault mint does not match expected pool mint")]
    InvalidVaultMint,
    #[msg("Liquidity amounts must be greater than zero")]
    InvalidLiquidityAmount,
    #[msg("Minimum LP output must be greater than zero")]
    InvalidMinLpOut,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Pool liquidity state is invalid")]
    InvalidPoolLiquidityState,
    #[msg("Slippage exceeded minimum LP out")]
    SlippageExceeded,
    #[msg("Non-bootstrap add liquidity is not implemented yet")]
    NonBootstrapNotImplemented,
    #[msg("LP mint must have no freeze authority")]
    InvalidLpMintFreezeAuthority,
}
