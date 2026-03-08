use crate::{
    constants::POOL_SEED,
    errors::Error,
    state::Pool,
    utils::{
        compute_swap_output_exact_input, resolve_swap_direction_and_reserves,
        validate_swap_exact_input_params,
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

    #[account(mut,
        seeds = [POOL_SEED, token_mint_x.key().as_ref(), token_mint_y.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut,
     address = pool.vault_x, token::token_program = token_program
    )]
    pub vault_x: InterfaceAccount<'info, TokenAccount>,

    #[account(mut,
     address = pool.vault_y, token::token_program = token_program
    )]
    pub vault_y: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::authority = signer, token::token_program = token_program)]
    pub user_input_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::authority = signer, token::token_program = token_program)]
    pub user_output_ata: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn swap_handler(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64) -> Result<()> {
    validate_swap_exact_input_params(amount_in, min_amount_out)?;

    let resolved_swap = resolve_swap_direction_and_reserves(
        ctx.accounts.user_input_ata.mint,
        ctx.accounts.user_output_ata.mint,
        ctx.accounts.token_mint_x.key(),
        ctx.accounts.token_mint_y.key(),
        ctx.accounts.vault_x.amount,
        ctx.accounts.vault_y.amount,
    )?; 

    let (amount_out, _fee_amount) = compute_swap_output_exact_input(
        resolved_swap.input_reserve,
        resolved_swap.output_reserve,
        amount_in,
        ctx.accounts.pool.fee_bps,
    )?;

    require!(amount_out >= min_amount_out, Error::SwapSlippageExceeded);


    Ok(())
}
