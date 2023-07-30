import { CommandInteraction } from 'discord.js'
import { SimpleCommandMessage } from 'discordx'

/**
 * Abstraction level to reply to either a slash command or a simple command message.
 * @param interaction
 * @param message
 */
export const replyToInteraction = async (
    interaction: CommandInteraction | SimpleCommandMessage,
    message: string | { [key: string]: any }
) => {
    if (interaction instanceof CommandInteraction) {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(message)
        } else {
            return await interaction.reply(message)
        }
    } else if (interaction instanceof SimpleCommandMessage) {
        return await interaction.message.reply(message)
    }
}
