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
    input_mint: Pubkey,
    output_mint: Pubkey,
    pool_mint_x: Pubkey,
    pool_mint_y: Pubkey,
    vault_x_reserve: u64,
    vault_y_reserve: u64,
) -> Result<ResolvedSwapDirection> {
    require!(input_mint != output_mint, Error::InvalidSwapTokenAccount);

    let resolved = if input_mint == pool_mint_x && output_mint == pool_mint_y {
        ResolvedSwapDirection {
            direction: SwapDirection::XToY,
            input_reserve: vault_x_reserve,
            output_reserve: vault_y_reserve,
        }
    } else if input_mint == pool_mint_y && output_mint == pool_mint_x {
        ResolvedSwapDirection {
            direction: SwapDirection::YToX,
            input_reserve: vault_y_reserve,
            output_reserve: vault_x_reserve,
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
