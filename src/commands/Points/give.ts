import { Category } from '@discordx/utilities'
import { PointManager } from '@services'
import { Discord, Guard, Slash, SlashChoice, SlashOption } from '@decorators'
import {
    ApplicationCommandOptionType,
    User as DUser,
    type CommandInteraction,
    GuildMember,
} from 'discord.js'
import { PointType } from '@entities'
import { injectable } from 'tsyringe'
import {
    simpleSuccessEmbed,
    simpleErrorEmbed,
    syncUser,
    shortPointType,
} from '@utils/functions'
import { Disabled } from '@guards'

@Discord()
@injectable()
@Category('Points')
export default class GivePoints {
    constructor(private pm: PointManager) {}

    @Slash({
        name: 'give',
        description: 'Chuyển MP',
    })
    @Guard(Disabled)
    async exchangePoint(
        @SlashOption({
            name: 'amount',
            description: 'Số lượng MP mà bạn muốn chuyển',
            type: ApplicationCommandOptionType.Integer,
            minValue: 1,
            required: true,
        })
        amount: number,
        @SlashOption({
            name: 'target',
            description: 'Đối tượng mà bạn muốn chuyển MP cho',
            type: ApplicationCommandOptionType.User,
            required: true,
        })
        member: GuildMember,
        interaction: CommandInteraction
    ) {
        const res = await this.pm.give(interaction.user, amount, member.user)

        if (res.success) {
            simpleSuccessEmbed(interaction, res.message)
        } else {
            simpleErrorEmbed(interaction, res.message, true)
        }
    }
}
