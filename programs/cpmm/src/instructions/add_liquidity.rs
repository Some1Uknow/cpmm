use crate::{state::Pool, utils::require_liquidity_invariants, POOL_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

pub fn add_liquidity_handler(ctx: Context<AddLiquidity>) -> Result<()> {
    require_liquidity_invariants(
        &ctx.accounts.pool,
        ctx.accounts.lp_mint.key(),
        ctx.accounts.token_mint_x.key(),
        ctx.accounts.token_mint_y.key(),
        ctx.accounts.vault_x.key(),
        ctx.accounts.vault_y.key(),
    )?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [POOL_SEED, token_mint_x.key().as_ref(), token_mint_y.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    pub token_mint_x: InterfaceAccount<'info, Mint>,

    pub token_mint_y: InterfaceAccount<'info, Mint>,

    pub lp_mint: InterfaceAccount<'info, Mint>,

    pub vault_x: InterfaceAccount<'info, TokenAccount>,

    pub vault_y: InterfaceAccount<'info, TokenAccount>,

    pub user_token_x_ata: InterfaceAccount<'info, TokenAccount>,

    pub user_token_y_ata: InterfaceAccount<'info, TokenAccount>,

    pub user_lp_mint_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
