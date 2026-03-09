use anchor_lang::prelude::*;

use crate::errors::Error;

pub fn compute_swap_output_without_fee(
    input_reserve: u64,
    output_reserve: u64,
    amount_in: u64,
) -> Result<u64> {
    require!(amount_in > 0, Error::InvalidSwapAmount);
    require!(
        input_reserve > 0 && output_reserve > 0,
        Error::InvalidPoolLiquidityState
    );

    let numerator = (amount_in as u128)
        .checked_mul(output_reserve as u128)
        .ok_or(Error::MathOverflow)?;

    let denominator = (input_reserve as u128)
        .checked_add(amount_in as u128)
        .ok_or(Error::MathOverflow)?;

    let amount_out = numerator
        .checked_div(denominator)
        .ok_or(Error::MathOverflow)?;

    require!(amount_out > 0, Error::InsufficientSwapOutput);
    require!(amount_out <= u64::MAX as u128, Error::MathOverflow);

    Ok(amount_out as u64)
}

pub fn compute_fee_amount(amount_in: u64, fee_bps: u16) -> Result<u64> {
    let fee_amount = (amount_in as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(Error::MathOverflow)?
        .checked_div(10_000)
        .ok_or(Error::MathOverflow)?;

    require!(fee_amount <= u64::MAX as u128, Error::MathOverflow);
    Ok(fee_amount as u64)
}

pub fn compute_swap_output_exact_input(
    input_reserve: u64,
    output_reserve: u64,
    amount_in: u64,
    fee_bps: u16,
) -> Result<(u64, u64)> {
    let fee_amount = compute_fee_amount(amount_in, fee_bps)?;
    let effective_amount_in = amount_in
        .checked_sub(fee_amount)
        .ok_or(Error::MathOverflow)?;

    require!(effective_amount_in > 0, Error::InsufficientSwapOutput);

    let amount_out =
        compute_swap_output_without_fee(input_reserve, output_reserve, effective_amount_in)?;

    Ok((amount_out, fee_amount))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_swap_output_without_fee_for_equal_reserves() {
        let amount_out = compute_swap_output_without_fee(1_000, 1_000, 100).unwrap();
        assert_eq!(amount_out, 90);
    }

    #[test]
    fn computes_swap_output_exact_input_with_fee() {
        let (amount_out, fee_amount) =
            compute_swap_output_exact_input(10_000, 10_000, 1_000, 30).unwrap();

        assert_eq!(fee_amount, 3);
        assert_eq!(amount_out, 906);
    }
}
