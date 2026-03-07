use crate::{constants::POOL_SEED, errors::Error, state::Pool};
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
    
    require!(amount_in > 0, Error::InvalidSwapAmount);
    require!(min_amount_out > 0, Error::SwapSlippageExceeded);

    let input_mint = ctx.accounts.user_input_ata.mint;
    let output_mint = ctx.accounts.user_output_ata.mint;

    require!(input_mint != output_mint, Error::InvalidSwapTokenAccount);

    let (input_reserve, output_reserve) = if input_mint == ctx.accounts.token_mint_x.key()
        && output_mint == ctx.accounts.token_mint_y.key()
    {
        (ctx.accounts.vault_x.amount, ctx.accounts.vault_y.amount)
    } else if input_mint == ctx.accounts.token_mint_y.key()
        && output_mint == ctx.accounts.token_mint_x.key()
    {
        (ctx.accounts.vault_y.amount, ctx.accounts.vault_x.amount)
    } else {
        return err!(Error::InvalidSwapTokenAccount);
    };

    require!(
        input_reserve > 0 && output_reserve > 0,
        Error::InvalidPoolLiquidityState
    );
    Ok(())
}
