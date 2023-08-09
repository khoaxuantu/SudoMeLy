import {
    Entity,
    EntityRepositoryType,
    ManyToOne,
    PrimaryKey,
    Property,
    Ref,
    ref,
} from '@mikro-orm/core'
import { EntityRepository } from '@mikro-orm/sqlite'
import { User } from './User'

// ===========================================
// ================= Entity ==================
// ===========================================

@Entity({ customRepository: () => RankHistoryRepository })
export class RankHistory {
    [EntityRepositoryType]?: RankHistoryRepository

    @PrimaryKey()
    id: number

    // @Property()
    // userId: string

    @ManyToOne(() => User, { ref: true })
    user: Ref<User>

    @Property({ type: 'integer' })
    season: number

    @Property({ type: 'integer' })
    months: number

    @Property()
    overall_points: string

    @Property()
    rank: string

    @Property()
    createdAt: Date = new Date()
}

// ===========================================
// =========== Custom Repository =============
// ===========================================

export class RankHistoryRepository extends EntityRepository<RankHistory> {}
