import { Category, RateLimit, TIME_UNIT } from '@discordx/utilities'
import { PointManager } from '@services'
import { Discord, Guard, Slash, SlashChoice, SlashOption } from '@decorators'
import {
    ApplicationCommandOptionType,
    User as DUser,
    type CommandInteraction,
    GuildMember,
    EmbedBuilder,
} from 'discord.js'
import { PointType } from '@entities'
import { injectable } from 'tsyringe'
import {
    simpleSuccessEmbed,
    simpleErrorEmbed,
    syncUser,
    shortPointType,
    replyToInteraction,
} from '@utils/functions'
import { Disabled } from '@guards'

@Discord()
@injectable()
@Category('Points')
export default class TransferPoints {
    constructor(private pm: PointManager) {}

    @Slash({
        name: 'transfer',
        description: 'Chuyển MP',
    })
    @Guard(RateLimit(TIME_UNIT.seconds, 5))
    async transferPoint(
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
        @SlashOption({
            name: 'message',
            description: 'Thông điệp',
            type: ApplicationCommandOptionType.String,
            required: true,
        })
        message: string,
        interaction: CommandInteraction
    ) {
        const res = await this.pm.transfer(
            interaction.user,
            amount,
            member.user,
            message
        )

        if (res.success) {
            const embed = new EmbedBuilder()
                .setTitle('Transaction')
                .setColor('Random')
                .setDescription(res.message)

            replyToInteraction(interaction, { embeds: [embed] })
        } else {
            simpleErrorEmbed(interaction, res.message, true)
        }
    }
}
