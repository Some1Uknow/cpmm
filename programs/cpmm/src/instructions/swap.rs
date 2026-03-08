use crate::{
    constants::POOL_SEED,
    errors::Error,
    state::Pool,
    utils::{
        compute_swap_output_exact_input, resolve_swap_direction_and_reserves,
        transfer_tokens_from_pool, transfer_tokens_from_user, validate_swap_exact_input_params,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(address = pool.token_mint_x)]
    pub token_mint_x: InterfaceAccount<'info, Mint>,

    #[account(address = pool.token_mint_y)]
    pub token_mint_y: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [POOL_SEED, token_mint_x.key().as_ref(), token_mint_y.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        constraint = input_vault.key() == pool.vault_x || input_vault.key() == pool.vault_y
            @ Error::InvalidSwapTokenAccount,
        token::token_program = token_program
    )]
    pub input_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = output_vault.key() == pool.vault_x || output_vault.key() == pool.vault_y
            @ Error::InvalidSwapTokenAccount,
        constraint = output_vault.key() != input_vault.key() @ Error::InvalidSwapTokenAccount,
        token::token_program = token_program
    )]
    pub output_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(address = input_vault.mint)]
    pub input_token_mint: InterfaceAccount<'info, Mint>,

    #[account(address = output_vault.mint)]
    pub output_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = input_token_mint,
        token::authority = signer,
        token::token_program = token_program
    )]
    pub user_input_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = output_token_mint,
        token::authority = signer,
        token::token_program = token_program
    )]
    pub user_output_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn swap_handler(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64) -> Result<()> {
    validate_swap_exact_input_params(amount_in, min_amount_out)?;

    let resolved_swap = resolve_swap_direction_and_reserves(
        ctx.accounts.input_vault.key(),
        ctx.accounts.output_vault.key(),
        ctx.accounts.pool.vault_x,
        ctx.accounts.pool.vault_y,
        ctx.accounts.input_vault.amount,
        ctx.accounts.output_vault.amount,
    )?;

    let (amount_out, _fee_amount) = compute_swap_output_exact_input(
        resolved_swap.input_reserve,
        resolved_swap.output_reserve,
        amount_in,
        ctx.accounts.pool.fee_bps,
    )?;

    require!(amount_out >= min_amount_out, Error::SwapSlippageExceeded);

    let pool_bump = ctx.accounts.pool.bump;

    let token_x_binding = ctx.accounts.token_mint_x.key();
    let token_y_binding = ctx.accounts.token_mint_y.key();

    let signer_seeds: &[&[u8]] = &[
        POOL_SEED,
        token_x_binding.as_ref(),
        token_y_binding.as_ref(),
        &[pool_bump],
    ];
    let signer = &[signer_seeds];

    transfer_tokens_from_user(
        ctx.accounts.user_input_ata.to_account_info(),
        ctx.accounts.input_vault.to_account_info(),
        ctx.accounts.input_token_mint.to_account_info(),
        ctx.accounts.signer.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        amount_in,
        ctx.accounts.input_token_mint.decimals,
    )?;

    transfer_tokens_from_pool(
        ctx.accounts.output_vault.to_account_info(),
        ctx.accounts.user_output_ata.to_account_info(),
        ctx.accounts.output_token_mint.to_account_info(),
        ctx.accounts.pool.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        signer,
        amount_out,
        ctx.accounts.output_token_mint.decimals,
    )?;

    Ok(())
}
