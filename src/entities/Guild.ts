import {
    Entity,
    PrimaryKey,
    Property,
    EntityRepositoryType,
} from '@mikro-orm/core'
import { EntityRepository } from '@mikro-orm/sqlite'

import { CustomBaseEntity } from './BaseEntity'

// ===========================================
// ================= Entity ==================
// ===========================================

@Entity({ customRepository: () => GuildRepository })
export class Guild extends CustomBaseEntity {
    [EntityRepositoryType]?: GuildRepository

    @PrimaryKey({ autoincrement: false })
    id!: string

    @Property({ nullable: true, type: 'string' })
    prefix: string | null

    /** ************ @PointRelated ************** **/
    // ===========================================
    // ===========================================
    // ===========================================

    // cant gain any point
    @Property({ nullable: true, type: 'array' })
    excluded_roles: string[] | null

    // cant gain any point
    @Property({ nullable: true, type: 'array' })
    excluded_channels: string[] | null

    // @Property({ nullable: true, type: 'array' })
    // normal_chat_channel_ids: string[] | null

    // special chat -> special points
    @Property({ nullable: true, type: 'array' })
    supporting_channel_ids: string[] | null

    @Property({ nullable: true, type: 'array' })
    club_channel_ids: string[] | null

    @Property({ nullable: true, type: 'array' })
    sharing_channel_ids: string[] | null

    // all voice channels are gainable channels
    // ===========================================
    // ===========================================
    // ===========================================

    @Property({ nullable: true, type: 'string' })
    nickname_request_channel_id: string | null

    @Property({ nullable: true, type: 'string' })
    greeting_channel_id: string | null

    @Property({ nullable: true, type: 'array' })
    reply_channel_ids: string[] | null

    @Property({ nullable: true, type: 'string' })
    log_channel_id: string | null

    @Property()
    deleted: boolean = false

    @Property()
    lastInteract: Date = new Date()
}

// ===========================================
// =========== Custom Repository =============
// ===========================================

export class GuildRepository extends EntityRepository<Guild> {
    async updateLastInteract(guildId?: string): Promise<void> {
        const guild = await this.findOne({ id: guildId })

        if (guild) {
            guild.lastInteract = new Date()
            await this.flush()
        }
    }

    async getActiveGuilds() {
        return this.find({ deleted: false })
    }
}
