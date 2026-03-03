use ::anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{
    constants::POOL_SEED,
    errors::Error,
    state::Pool,
    utils::{is_allowed_fee_tier, require_canonical_mints},
};

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_mint_x: InterfaceAccount<'info, Mint>,

    pub token_mint_y: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [POOL_SEED, token_mint_x.key().as_ref(), token_mint_y.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_pool_handler(ctx: Context<InitializePool>, fee_bps: u16) -> Result<()> {
    require_canonical_mints(
        ctx.accounts.token_mint_x.key(),
        ctx.accounts.token_mint_y.key(),
    )?;
    require!(is_allowed_fee_tier(fee_bps), Error::InvalidFeeTier);

    ctx.accounts.pool.set_inner(Pool {
        authority: ctx.accounts.authority.key(),
        token_mint_x: ctx.accounts.token_mint_x.key(),
        token_mint_y: ctx.accounts.token_mint_y.key(),
        fee_bps,
        bump: ctx.bumps.pool,
    });
    Ok(())
}
