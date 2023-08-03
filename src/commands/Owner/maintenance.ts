import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js'
import { Client } from 'discordx'

import { Discord, Guard, Slash, SlashOption } from '@decorators'
import { Disabled } from '@guards'
import {
    setMaintainingStatus,
    setMaintenance,
    simpleSuccessEmbed,
} from '@utils/functions'
import { Store } from '@services'

@Discord()
export default class MaintenanceCommand {
    
    @Slash({
        name: 'maintenance',
    })
    @Guard(Disabled)
    async maintenance(
        @SlashOption({
            name: 'state',
            type: ApplicationCommandOptionType.Boolean,
            required: true,
        })
        state: boolean,
        interaction: CommandInteraction,
        client: Client,
        { localize }: InteractionData
    ) {
        await setMaintenance(state)

        await setMaintainingStatus()

        simpleSuccessEmbed(
            interaction,
            localize.COMMANDS.MAINTENANCE.EMBED.DESCRIPTION({
                state: state ? 'on' : 'off',
            })
        )
    }
}
