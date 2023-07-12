import { ArgsOf, Client, Guard, SimpleCommandMessage } from "discordx"
import { inject, injectable, delay, container } from "tsyringe"

import { Discord, On, OnCustom } from "@decorators"
import { Guild as EntityGuild, User } from "@entities"
import { Maintenance } from "@guards"
import { Database, EventManager, Logger, Stats } from "@services"
import { getPrefixFromMessage, resolveDependency, syncUser } from "@utils/functions"
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Guild, GuildMember, TextChannel } from "discord.js"
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

        const greetingChannel = await guild.channels.cache.find(v => v.name.includes(generalConfig.mely.greeting.keywords.channel))

        if (!greetingChannel || greetingChannel.type !== ChannelType.GuildText) return;

        if (member.user.bot) {
            const botRole =
                (await guild.roles.cache.find((r) => r.name.toLowerCase() == "bots")) ||
                (await guild.roles.create({
                    name: "bots",
                    reason: "role to add all bots in",
                }));

            try {
                await member.roles.add(botRole);
            } catch (error) {
                console.log(error);
            }
            return;
        }

        if (!guild.rulesChannel) return;

        const generalChat = await guild.channels.cache.find((c) =>
            c.name.toLowerCase().includes("general-chat")
        );

        if (!generalChat) return;

        const banner = await this.getRandomWelcomeImage(guild);

        let content = `cout << "hello world, ${member}!";`;

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setURL(`${guild.rulesChannel.url}`)
                .setLabel("Đọc luật đã nào!"),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setURL(`${generalChat.url}`)
                .setLabel("Cùng tám thôi!")
        );

        const embed = new EmbedBuilder()
            .setColor("Random")
            .setTitle(
                `Chào mừng ${member.displayName} đã đến với vũ trụ ${guild.name
                }!`
            )
            .setThumbnail(member.displayAvatarURL())
            .setImage(banner?.url ?? null);

        greetingChannel.send({
            content,
            embeds: [embed],
            components: [row]
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

    async getRandomWelcomeImage(guild: Guild) {
        const imagesChannelCache = await guild.channels.cache.find((c) =>
            c.name.toLowerCase().includes(generalConfig.mely.greeting.keywords.imageChannel)
        );

        if (!imagesChannelCache) return;

        const imagesChannel = await imagesChannelCache.fetch();

        if (imagesChannel.type !== ChannelType.GuildText) return;

        const messages = await imagesChannel.messages.fetch();

        const message = await messages
            .filter((x) => x.attachments.size || !!x.attachments)
            .random();

        if (!message) return;

        const banner = await message.attachments
            .filter((x) => `${x.contentType}`.includes("image"))
            .random();

        return banner;
    }
}
