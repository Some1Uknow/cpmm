use crate::{
    constants::POOL_SEED, curve::liquidity::compute_withdraw_amounts, errors::Error, state::Pool,
    utils::transfer_tokens_from_pool,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

pub fn remove_liquidity_handler(
    ctx: Context<RemoveLiquidity>,
    lp_shares_to_burn: u64,
    min_token_x_out: u64,
    min_token_y_out: u64,
) -> Result<()> {
    require!(lp_shares_to_burn > 0, Error::InvalidLiquidityAmount);
    require!(min_token_x_out > 0, Error::InvalidLiquidityAmount);
    require!(min_token_y_out > 0, Error::InvalidLiquidityAmount);

    let (token_x_out, token_y_out) = compute_withdraw_amounts(
        ctx.accounts.vault_x.amount,
        ctx.accounts.vault_y.amount,
        ctx.accounts.lp_mint.supply,
        lp_shares_to_burn,
    )?;

    require!(token_x_out >= min_token_x_out, Error::SlippageExceeded);
    require!(token_y_out >= min_token_y_out, Error::SlippageExceeded);

    Ok(())
}
#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [POOL_SEED, token_mint_x.key().as_ref(), token_mint_y.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(address = pool.token_mint_x)]
    pub token_mint_x: InterfaceAccount<'info, Mint>,

    #[account(address = pool.token_mint_y)]
    pub token_mint_y: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        address = pool.lp_mint,
        mint::authority = pool,
        mint::token_program = token_program,
        constraint = lp_mint.freeze_authority.is_none() @ Error::InvalidLpMintFreezeAuthority
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(mut, address = pool.vault_x, token::token_program = token_program)]
    pub vault_x: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, address = pool.vault_y, token::token_program = token_program)]
    pub vault_y: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::mint = token_mint_x, token::authority = signer, token::token_program = token_program)]
    pub user_token_x_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::mint = token_mint_y, token::authority = signer, token::token_program = token_program)]
    pub user_token_y_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::mint = lp_mint, token::authority = signer, token::token_program = token_program)]
    pub user_lp_mint_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
