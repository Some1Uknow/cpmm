use crate::constants::ALLOWED_FEE_TIERS_BPS;

pub fn is_allowed_fee_tier(fee_bps: u16) -> bool {
    ALLOWED_FEE_TIERS_BPS.contains(&fee_bps)
}
