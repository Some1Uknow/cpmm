use ::anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{
    constants::{DISCRIMINATOR_SIZE, POOL_SEED},
    curve::fees::is_allowed_fee_tier,
    errors::Error,
    state::Pool,
    utils::{require_canonical_mints, require_pool_vault_invariants},
};

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_mint_x: InterfaceAccount<'info, Mint>,

    pub token_mint_y: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,

    #[account(
        init,
        payer = authority,
        space = DISCRIMINATOR_SIZE + Pool::INIT_SPACE,
        seeds = [POOL_SEED, token_mint_x.key().as_ref(), token_mint_y.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = pool,
        mint::token_program = token_program
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = token_mint_x,
        associated_token::authority = pool,
        associated_token::token_program = token_program
    )]
    pub vault_x: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = token_mint_y,
        associated_token::authority = pool,
        associated_token::token_program = token_program
    )]
    pub vault_y: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_pool_handler(ctx: Context<InitializePool>, fee_bps: u16) -> Result<()> {
    require_canonical_mints(
        ctx.accounts.token_mint_x.key(),
        ctx.accounts.token_mint_y.key(),
    )?;

    require!(is_allowed_fee_tier(fee_bps), Error::InvalidFeeTier);

    require_pool_vault_invariants(
        ctx.accounts.pool.key(),
        ctx.accounts.token_mint_x.key(),
        ctx.accounts.token_mint_y.key(),
        &ctx.accounts.vault_x,
        &ctx.accounts.vault_y,
    )?;

    ctx.accounts.pool.set_inner(Pool {
        authority: ctx.accounts.authority.key(),
        token_mint_x: ctx.accounts.token_mint_x.key(),
        token_mint_y: ctx.accounts.token_mint_y.key(),
        vault_x: ctx.accounts.vault_x.key(),
        vault_y: ctx.accounts.vault_y.key(),
        lp_mint: ctx.accounts.lp_mint.key(),
        fee_bps,
        bump: ctx.bumps.pool,
    });
    Ok(())
}
