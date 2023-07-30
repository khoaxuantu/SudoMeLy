import {
    AutocompleteInteraction,
    ButtonInteraction,
    Channel,
    ChannelSelectMenuInteraction,
    ChannelType,
    ChatInputCommandInteraction,
    CommandInteraction,
    Interaction,
    MentionableSelectMenuInteraction,
    MessageContextMenuCommandInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    TextBasedChannel,
    UserContextMenuCommandInteraction,
    UserSelectMenuInteraction,
} from 'discord.js'
import { GuardFunction, SimpleCommandMessage } from 'discordx'

import { getLocaleFromInteraction, L } from '@i18n'
import {
    replyToInteraction,
    resolveChannel,
    resolveGuild,
    resolveUser,
} from '@utils/functions'

/**
 * Prevent anyone but author to interact
 */
export const AuthorOnly: GuardFunction<Interaction> = async (
    interaction,
    client,
    next
) => {
    if (
        interaction instanceof UserSelectMenuInteraction ||
        interaction instanceof ChannelSelectMenuInteraction ||
        interaction instanceof MentionableSelectMenuInteraction ||
        interaction instanceof RoleSelectMenuInteraction ||
        interaction instanceof StringSelectMenuInteraction ||
        interaction instanceof ButtonInteraction
    ) {
        const action = async (channel: TextBasedChannel | null) => {
            if (
                channel &&
                interaction.message &&
                interaction.message.reference &&
                interaction.message.reference.messageId
            ) {
                const message = await channel.messages.fetch(
                    interaction.message.reference.messageId
                )

                if (message.author.id === interaction.user.id) {
                    next()
                } else {
                    interaction.reply({
                        content: `You cannot use this!`,
                        ephemeral: true,
                    })
                }
            }
        }

        if (
            interaction instanceof UserSelectMenuInteraction ||
            interaction instanceof ChannelSelectMenuInteraction ||
            interaction instanceof MentionableSelectMenuInteraction ||
            interaction instanceof RoleSelectMenuInteraction
        ) {
            const { channel } = interaction
            action(channel)
        } else if (
            interaction instanceof StringSelectMenuInteraction ||
            interaction instanceof ButtonInteraction
        ) {
            const channel = resolveChannel(interaction)
            action(channel)
        }
    }
}
