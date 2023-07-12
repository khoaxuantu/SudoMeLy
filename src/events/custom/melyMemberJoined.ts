import { ArgsOf, Client, Guard, SimpleCommandMessage } from "discordx"
import { inject, injectable, delay, container } from "tsyringe"

import { Discord, On, OnCustom } from "@decorators"
import { Guild, User } from "@entities"
import { Maintenance } from "@guards"
import { Database, EventManager, Logger, Stats } from "@services"
import { getPrefixFromMessage, resolveDependency, syncUser } from "@utils/functions"
import { ChannelType, GuildMember, TextChannel } from "discord.js"
import { generalConfig } from "@configs"

@Discord()
@injectable()
export default class MelyMemberJoined {

    constructor(
        private stats: Stats,
        private logger: Logger,
        private db: Database,
        private eventManager: EventManager
    ) { }

    // =============================
    // ========= Handler ===========
    // =============================

    @OnCustom('melyMemberJoined')
    async melyMemberJoinedHandler(member: GuildMember) {

        const { guild } = member
        if (guild.id != process.env["TEST_GUILD_ID"]) return;


        const greetingChannel = await guild.channels.cache.find(v => v.name.includes(generalConfig.mely.greetingChannelKeywords))

        if (!greetingChannel || greetingChannel.type !== ChannelType.GuildText) return;
        
        greetingChannel.send({
            content: ` ${member} vua tham gia ${guild.name}`
        })

    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('guildMemberAdd')
    @Guard(
        Maintenance
    )
    async melyMemberJoinedEmitter(
        [member]: ArgsOf<'guildMemberAdd'>,
        client: Client
    ) {
        /**
         * @param {GuildMember} member
         */
        this.eventManager.emit("melyMemberJoined", member)
        console.log(member)
    }
}
