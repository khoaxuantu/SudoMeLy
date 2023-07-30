import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CommandInteraction,
    EmbedBuilder,
    PublicThreadChannel,
    UserSelectMenuBuilder,
    userMention,
} from 'discord.js'

import { replyToInteraction } from '@utils/functions'
/**
 * Send a simple success embed
 * @param interaction - discord interaction
 * @param message - message to log
 */
export const simpleSuccessEmbed = (
    interaction: CommandInteraction,
    message: string
) => {
    const embed = new EmbedBuilder()
        .setColor(0x57f287) // GREEN // see: https://github.com/discordjs/discord.js/blob/main/packages/discord.js/src/util/Colors.js
        .setTitle(`✅ ${message}`)

    replyToInteraction(interaction, { embeds: [embed] })
}

/**
 * Send a simple error embed
 * @param interaction - discord interaction
 * @param message - message to log
 */
export const simpleErrorEmbed = (
    interaction: CommandInteraction,
    message: string
) => {
    const embed = new EmbedBuilder()
        .setColor(0xed4245) // RED // see: https://github.com/discordjs/discord.js/blob/main/packages/discord.js/src/util/Colors.js
        .setTitle(`❌ ${message}`)

    replyToInteraction(interaction, { embeds: [embed] })
}

export async function sendForm(threadChannel: PublicThreadChannel<true>) {
    const questionEmoji = '❔'
    const markedEmoji = '✅'

    const startMessage = await threadChannel.fetchStarterMessage()

    if (!startMessage) {
        return
    }

    if (
        startMessage.reactions.resolve(questionEmoji)?.me ||
        startMessage.reactions.resolve(markedEmoji)?.me
    ) {
        return
    }

    if (threadChannel.archived) {
        await threadChannel.setArchived(false, 'Collect MeLy points')
    }

    await startMessage.react(questionEmoji)

    const asker = await threadChannel.fetchOwner()

    if (!asker) return

    const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle(threadChannel.name)
        .setDescription(
            `${userMention(
                asker.id
            )} oi, ai vừa giúp bạn giải quyết vấn đề ở ${threadChannel} vậy?\n\n> Hãy chọn 1 người trong menu xổ xuống ở đưới nếu người đó đã giúp bạn giải quyết chủ đề bạn hỏi, nếu không có ai giúp bạn giải quyết hoặc không có tên họ trong danh sách hãy bấm nút **\`KHÔNG\`** màu đỏ.`
        )

    const rows = (state: boolean) => [
        new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId('qna-select')
                .setMaxValues(1)
                .setMinValues(1)
                .setPlaceholder('Chọn người đã giúp bạn...')
                .setDisabled(state)
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('qna-cancel')
                .setDisabled(state)
                .setStyle(ButtonStyle.Danger)
                .setLabel('KHÔNG')
        ),
    ]

    await startMessage
        .reply({
            // content: `${asker.guildMember}`,
            embeds: [embed],
            components: [...rows(false)],
        })
        .then((m) => m.pin())
}
