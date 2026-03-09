use anchor_lang::prelude::*;

use crate::errors::Error;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SwapDirection {
    XToY,
    YToX,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ResolvedSwapDirection {
    pub direction: SwapDirection,
    pub input_reserve: u64,
    pub output_reserve: u64,
}

pub fn validate_swap_exact_input_params(
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    require!(amount_in > 0, Error::InvalidSwapAmount);
    require!(min_amount_out > 0, Error::SwapSlippageExceeded);
    Ok(())
}

pub fn resolve_swap_direction_and_reserves(
    input_vault: Pubkey,
    output_vault: Pubkey,
    pool_vault_x: Pubkey,
    pool_vault_y: Pubkey,
    input_vault_reserve: u64,
    output_vault_reserve: u64,
) -> Result<ResolvedSwapDirection> {
    require!(input_vault != output_vault, Error::InvalidSwapTokenAccount);

    let resolved = if input_vault == pool_vault_x && output_vault == pool_vault_y {
        ResolvedSwapDirection {
            direction: SwapDirection::XToY,
            input_reserve: input_vault_reserve,
            output_reserve: output_vault_reserve,
        }
    } else if input_vault == pool_vault_y && output_vault == pool_vault_x {
        ResolvedSwapDirection {
            direction: SwapDirection::YToX,
            input_reserve: input_vault_reserve,
            output_reserve: output_vault_reserve,
        }
    } else {
        return err!(Error::InvalidSwapTokenAccount);
    };

    require!(
        resolved.input_reserve > 0 && resolved.output_reserve > 0,
        Error::InvalidPoolLiquidityState
    );

    Ok(resolved)
}
