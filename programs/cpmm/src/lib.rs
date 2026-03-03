use anchor_lang::prelude::*;

declare_id!("CmnAoRD5Vm9PvcoqMecWbBYg6p8AVhkptbHjsXNACys5");

#[program]
pub mod cpmm {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
