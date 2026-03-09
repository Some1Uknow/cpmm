use anchor_lang::prelude::*;

pub mod constants;
pub mod curve;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

pub use instructions::*;

declare_id!("CmnAoRD5Vm9PvcoqMecWbBYg6p8AVhkptbHjsXNACys5");

#[program]
pub mod cpmm {
    use super::*;
    use crate::instructions::{
        add_liquidity::{self, AddLiquidity},
        initialize::{self, Initialize},
        initialize_pool::{self, InitializePool},
        swap::{self, Swap},
    };

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::initialize_handler(ctx)
    }

    pub fn initialize_pool(ctx: Context<InitializePool>, fee_bps: u16) -> Result<()> {
        initialize_pool::initialize_pool_handler(ctx, fee_bps)
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        max_token_x_in: u64,
        max_token_y_in: u64,
        min_lp_shares_out: u64,
    ) -> Result<()> {
        add_liquidity::add_liquidity_handler(ctx, max_token_x_in, max_token_y_in, min_lp_shares_out)
    }

    pub fn swap(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64) -> Result<()> {
        swap::swap_handler(ctx, amount_in, min_amount_out)
    }

    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_shares_to_burn: u64,
        min_token_x_out: u64,
        min_token_y_out: u64,
    ) -> Result<()> {
        remove_liquidity::remove_liquidity_handler(
            ctx,
            lp_shares_to_burn,
            min_token_x_out,
            min_token_y_out,
        )
    }
}
