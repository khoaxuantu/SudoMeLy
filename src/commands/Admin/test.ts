import { Category } from "@discordx/utilities"
import { ApplicationCommandOptionType, CommandInteraction, GuildMember } from "discord.js"
import { Client, SimpleCommand, SimpleCommandMessage } from "discordx"
import { injectable } from "tsyringe"

import { generalConfig } from "@configs"
import { Discord, Slash, SlashOption } from "@decorators"
import { Guild } from "@entities"
import { UnknownReplyError } from "@errors"
import { Guard, UserPermissions } from "@guards"
import { Database, EventManager } from "@services"
import { resolveGuild, simpleSuccessEmbed } from "@utils/functions"

@Discord()
@injectable()
@Category('Admin')
export default class PrefixCommand {

    constructor(
        private db: Database,
        private eventManager: EventManager
    ) { }

    @SimpleCommand({ name: 'test' })
    @Guard(
        UserPermissions(['Administrator'])
    )
    async test(
        command: SimpleCommandMessage, client: Client
    ) {

        /**
         * @param {GuildMember} member
         */
        this.eventManager.emit("melyMemberJoined", command.message.member)
        command.message.react("✅")
    }
}
