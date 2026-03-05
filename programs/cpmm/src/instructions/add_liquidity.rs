use crate::{
    errors::Error,
    state::Pool,
    utils::{compute_bootstrap_lp_to_mint, validate_add_liquidity_inputs},
    POOL_SEED,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

pub fn add_liquidity_handler(
    ctx: Context<AddLiquidity>,
    amount_x: u64,
    amount_y: u64,
    min_lp_out: u64,
) -> Result<()> {
    validate_add_liquidity_inputs(amount_x, amount_y, min_lp_out)?;

    let reserve_x = ctx.accounts.vault_x.amount;
    let reserve_y = ctx.accounts.vault_y.amount;

    let lp_to_mint = compute_bootstrap_lp_to_mint(reserve_x, reserve_y, amount_x, amount_y)?;

    require!(lp_to_mint >= min_lp_out, Error::SlippageExceeded);

    msg!(
        "bootstrap add_liquidity: reserve_x={}, reserve_y={}, lp_to_mint={}",
        reserve_x,
        reserve_y,
        lp_to_mint
    );

    msg!("reserve_x={}, reserve_y={}", reserve_x, reserve_y);

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

    #[account(address = pool.token_mint_x)]
    pub token_mint_x: InterfaceAccount<'info, Mint>,

    #[account(address = pool.token_mint_y)]
    pub token_mint_y: InterfaceAccount<'info, Mint>,

    #[account(address = pool.lp_mint)]
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
