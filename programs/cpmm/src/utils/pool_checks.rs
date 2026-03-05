use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenAccount;

use crate::errors::Error;

pub fn require_pool_vault_invariants(
    pool: Pubkey,
    mint_x: Pubkey,
    mint_y: Pubkey,
    vault_x: &TokenAccount,
    vault_y: &TokenAccount,
) -> Result<()> {
    require_keys_eq!(vault_x.owner, pool, Error::InvalidVaultOwner);
    require_keys_eq!(vault_y.owner, pool, Error::InvalidVaultOwner);

    require_keys_eq!(vault_x.mint, mint_x, Error::InvalidVaultMint);
    require_keys_eq!(vault_y.mint, mint_y, Error::InvalidVaultMint);

    Ok(())
}
