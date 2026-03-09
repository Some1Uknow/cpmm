use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Burn, MintTo, TransferChecked};

pub fn transfer_tokens_from_user<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
    decimals: u8,
) -> Result<()> {
    let accounts = TransferChecked {
        from,
        to,
        mint,
        authority,
    };

    let cpi_ctx = CpiContext::new(token_program, accounts);
    token_interface::transfer_checked(cpi_ctx, amount, decimals)
}

pub fn transfer_tokens_from_pool<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
    decimals: u8,
) -> Result<()> {
    let accounts = TransferChecked {
        from,
        to,
        mint,
        authority,
    };

    let cpi_ctx = CpiContext::new_with_signer(token_program, accounts, signer_seeds);
    token_interface::transfer_checked(cpi_ctx, amount, decimals)
}

pub fn mint_tokens_with_signer<'info>(
    mint: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let accounts = MintTo {
        mint,
        to,
        authority,
    };

    let cpi_ctx = CpiContext::new_with_signer(token_program, accounts, signer_seeds);
    token_interface::mint_to(cpi_ctx, amount)
}

pub fn burn_tokens_from_user<'info>(
    mint: AccountInfo<'info>,
    from: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let accounts = Burn {
        mint,
        from,
        authority,
    };

    let cpi_ctx = CpiContext::new(token_program, accounts);
    token_interface::burn(cpi_ctx, amount)
}
