import { Category, RateLimit, TIME_UNIT } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    EmbedBuilder,
    type CommandInteraction,
    User as DUser,
} from 'discord.js'
import {
    Client,
    Guard,
    SimpleCommand,
    SimpleCommandMessage,
    SimpleCommandOption,
    SimpleCommandOptionType,
} from 'discordx'

import { Discord, Slash, SlashChoice, SlashOption } from '@decorators'
import {
    getRandomInt,
    numberFormat,
    replyToInteraction,
} from '@utils/functions'
import { PointManager } from '@services'
import { injectable } from 'tsyringe'

@Discord()
@injectable()
@Category('Games')
export default class EvenOddGameCommand {
    constructor(private pm: PointManager) {}

    @SimpleCommand({ aliases: ['chanle'], name: 'even_odd' })
    @Guard(RateLimit(TIME_UNIT.seconds, 5))
    async evenOddCmd(
        @SimpleCommandOption({
            name: 'choice',
            type: SimpleCommandOptionType.String,
            description: '[chan, even, c, chẵn, e, le, odd, l, lẻ, o]',
        })
        choice: string | undefined,
        @SimpleCommandOption({
            name: 'amount',
            type: SimpleCommandOptionType.Number,
            description: 'Số MP cược (lớn hơn 0)',
        })
        amount: number | undefined,
        command: SimpleCommandMessage
    ) {
        const acceptedEvens = ['chan', 'even', 'c', 'chẵn', 'e']
        const acceptedOdds = ['le', 'odd', 'l', 'lẻ', 'o']

        if (
            !choice ||
            (!acceptedEvens.includes(choice) &&
                !acceptedOdds.includes(choice)) ||
            (amount && amount < 1)
        ) {
            return command.sendUsageSyntax()
        }

        const parsedChoice: 'even' | 'odd' = acceptedEvens.includes(choice)
            ? 'even'
            : 'odd'

        const embed = await this.getEmbed(
            command.message.author,
            parsedChoice,
            amount,
            command.message.client.user.id
        )

        command.message.reply({
            embeds: [embed],
        })
    }

    @Slash({
        name: 'chanle',
        description: 'Chẵn lẻ (Đoán chẵn hãy lẻ trong khoảng 1 đến 100)',
    })
    async evenOddSlash(
        @SlashChoice({ name: 'Chẵn (Even)', value: 'even' })
        @SlashChoice({ name: 'Lẻ (Odd)', value: 'odd' })
        @SlashOption({
            name: 'choice',
            type: ApplicationCommandOptionType.String,
            description: 'Your choice',
            required: true,
        })
        choice: string,
        @SlashOption({
            name: 'mp',
            type: ApplicationCommandOptionType.Number,
            description: 'Your MP to bet',
            minValue: 1,
        })
        amount: number | undefined,
        interaction: CommandInteraction,
        client: Client
    ) {
        const embed = await this.getEmbed(
            interaction.user,
            choice,
            amount,
            interaction.client.user.id
        )

        await replyToInteraction(interaction, { embeds: [embed] })
    }

    private async getEmbed(
        user: DUser,
        choice: string,
        amount: number | undefined,
        clientUserId: string
    ) {
        const number = getRandomInt(1, 100)

        const numberType = number % 2 == 0 ? 'even' : 'odd'

        const isWin = choice === numberType

        const embed = new EmbedBuilder()
            .setTitle(isWin ? 'Bạn thắng!' : 'Thua rồi :(')
            .setColor('Random')
            .setAuthor({
                name: user.username,
                iconURL: user.displayAvatarURL(),
            })
            .setFields(
                {
                    name: 'Bạn chọn',
                    value: choice === 'odd' ? 'Lẻ' : 'Chẵn',
                },
                { name: 'Kết quả', value: `${number}` }
            )

        if (amount) {
            embed.setFooter({
                text: `${isWin ? 'Cộng' : 'Trừ'} ${numberFormat(amount)} MP!`,
            })
            await this.pm.add(
                {
                    user: user,
                    value: amount * (isWin ? 1 : -1),
                    type: 'mely_points',
                },
                clientUserId,
                'Chan Le'
            )
        }

        return embed
    }
}
