import { Category } from '@discordx/utilities'
import { Database } from '@services'
import {
    Discord,
    SlashGroup,
    Slash,
    SlashChoice,
    SlashOption,
    Guard,
} from '@decorators'
import {
    ApplicationCommandOptionType,
    type CommandInteraction,
} from 'discord.js'
import { Guild, PointType, User } from '@entities'
import { injectable } from 'tsyringe'
import {
    simpleSuccessEmbed,
    simpleErrorEmbed,
    syncUser,
    shortPointType,
} from '@utils/functions'
import { Point } from '@guards'
import { Loaded } from '@mikro-orm/core'

@Discord()
@injectable()
@Category('Points')
@SlashGroup({
    description: 'Customize things',
    name: 'custom',
})
@SlashGroup('custom')
export default class SetQuoteInPoint {
    constructor(private db: Database) {}

    @Slash({
        name: 'point-quote',
        description: 'Set /point quote',
    })
    @Guard(Point(10))
    async setPointQuote(
        @SlashOption({
            name: 'quote',
            type: ApplicationCommandOptionType.String,
            description: 'Your cool quote',
            minLength: 2,
            maxLength: 128,
            required: true,
        })
        quote: string,
        interaction: CommandInteraction
    ) {
        const userData = await this.db
            .get(User)
            .findOne({ id: interaction.user.id })

        if (!userData) {
            return simpleErrorEmbed(
                interaction,
                `You are not in our db :(`,
                true
            )
        }

        userData.description = quote
        await this.db.get(User).flush()
        await simpleSuccessEmbed(interaction, `Done!`)
    }
}
