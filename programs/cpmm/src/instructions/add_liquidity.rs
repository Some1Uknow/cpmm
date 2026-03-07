use crate::{
    errors::Error,
    state::Pool,
    utils::{compute_lp_shares_and_token_deposit_amounts, validate_add_liquidity_inputs},
    POOL_SEED,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

pub fn add_liquidity_handler(
    ctx: Context<AddLiquidity>,
    max_token_x_in: u64,
    max_token_y_in: u64,
    min_lp_shares_out: u64,
) -> Result<()> {
    validate_add_liquidity_inputs(max_token_x_in, max_token_y_in, min_lp_shares_out)?;

    let token_x_reserve = ctx.accounts.vault_x.amount;
    let token_y_reserve = ctx.accounts.vault_y.amount;

    let total_lp_shares_supply = ctx.accounts.lp_mint.supply;

    let (lp_shares_to_mint, token_x_to_deposit, token_y_to_deposit) =
        compute_lp_shares_and_token_deposit_amounts(
            token_x_reserve,
            token_y_reserve,
            total_lp_shares_supply,
            max_token_x_in,
            max_token_y_in,
        )?;

    require!(
        lp_shares_to_mint >= min_lp_shares_out,
        Error::SlippageExceeded
    );

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

    let mint_to_lp = MintTo {
        mint: ctx.accounts.lp_mint.to_account_info(),
        to: ctx.accounts.user_lp_mint_ata.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };

    let cpi_ctx_mint_lp = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        mint_to_lp,
        signer,
    );

    token_interface::mint_to(cpi_ctx_mint_lp, lp_shares_to_mint)?;

    let transfer_x = TransferChecked {
        from: ctx.accounts.user_token_x_ata.to_account_info(),
        to: ctx.accounts.vault_x.to_account_info(),
        mint: ctx.accounts.token_mint_x.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    };

    let transfer_y = TransferChecked {
        from: ctx.accounts.user_token_y_ata.to_account_info(),
        to: ctx.accounts.vault_y.to_account_info(),
        mint: ctx.accounts.token_mint_y.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    };

    let cpi_ctx_x = CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_x);
    let cpi_ctx_y = CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_y);

    token_interface::transfer_checked(
        cpi_ctx_x,
        token_x_to_deposit,
        ctx.accounts.token_mint_x.decimals,
    )?;
    token_interface::transfer_checked(
        cpi_ctx_y,
        token_y_to_deposit,
        ctx.accounts.token_mint_y.decimals,
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
