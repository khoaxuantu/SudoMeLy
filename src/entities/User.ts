import {
    BigIntType,
    ChangeSet,
    ChangeSetType,
    DateTimeType,
    Entity,
    EntityData,
    EntityName,
    EntityProperty,
    EntityRepositoryType,
    EventArgs,
    EventSubscriber,
    Formula,
    Loaded,
    PrimaryKey,
    Property,
    Subscriber,
    Type,
    OneToMany,
    ValidationError,
    Collection,
} from '@mikro-orm/core'
import { EntityRepository } from '@mikro-orm/sqlite'
import { CustomBaseEntity } from './BaseEntity'
import { checkRank, resolveDependency } from '@utils/functions'
import { EventManager, Logger } from '@services'
import { TransformContext } from '@mikro-orm/core/types/Type'
import { RankHistory } from './RankHistory'

class Int64 extends Type<number, number> {
    convertToDatabaseValue(value: number): number {
        return value
    }

    convertToJSValue(value: number): number {
        return value
    }

    getColumnType(): string {
        return 'bigint'
    }
}

// ===========================================
// ================= Entity ==================
// ===========================================

@Entity({ customRepository: () => UserRepository })
export class User extends CustomBaseEntity {
    [EntityRepositoryType]?: UserRepository

    @PrimaryKey({ autoincrement: false })
    id!: string

    @Property()
    lastInteract: Date = new Date()

    @OneToMany(() => RankHistory, rankHistory => rankHistory.user)
    rankHistories = new Collection<RankHistory>(this);

    /**
     * @CUSTOMIZE
     */

    @Property({ type: 'text', nullable: true })
    description: string | null
    @Property({ type: 'text', nullable: true })
    rankCardPalette: string | null

    /**
     * @RANKING
     */

    @Property({ type: Int64 })
    chat_points: number = 0

    @Property({ type: Int64 })
    voice_points: number = 0

    @Property({ type: Int64 })
    mely_points: number = 0

    /**
     * @VOICE_STATES
     */

    @Property({ type: DateTimeType, nullable: true })
    joinedVoiceTime: Date | null

    @Property({ type: DateTimeType, nullable: true })
    onMicTime: Date | null

    @Property({ type: DateTimeType, nullable: true })
    onStreamTime: Date | null

    @Property({ type: DateTimeType, nullable: true })
    onVideoTime: Date | null

    @Formula('ROUND((chat_points * 50 + voice_points * 50) / 100)')
    overall_points: number
}

// ===========================================
// =========== Custom Repository =============
// ===========================================

export class UserRepository extends EntityRepository<User> {
    async updateLastInteract(userId?: string): Promise<void> {
        const user = await this.findOne({ id: userId })

        if (user) {
            user.lastInteract = new Date()
            await this.flush()
        }
    }

    async addPoints(userId: string, points: Point[]): Promise<void> {
        const userData = await this.findOne({ id: userId })

        if (userData) {
            this.loopAddPoints(points, userData)
            await this.flush()
        }
    }

    async addPointsToMany(
        users: { id: string; points: Point[] }[]
    ): Promise<void> {
        const usersData = await this.find({ id: users.map((v) => v.id) })

        if (usersData && usersData.length) {
            usersData.forEach((userData, index) => {
                const foundUser = users.find((u) => u.id === userData.id)
                if (foundUser) {
                    this.loopAddPoints(foundUser.points, userData)
                }
            })
        }

        await this.flush()
    }

    private loopAddPoints(points: Point[], userData: Loaded<User, never>) {
        points.forEach((point) => {
            if (point.type !== 'overall_points') {
                if (point.value >= 0) {
                    userData[point.type] += Math.floor(point.value)
                } else {
                    userData[point.type] -= Math.abs(Math.floor(point.value))
                }
            }
        })
    }

    getOverallPointsUser(user: User): User {
        return {
            ...user,
            overall_points: Math.round(
                (user.chat_points * 50 + user.voice_points * 50) / 100
            ),
        }
    }
}

export interface Point {
    type: PointType
    value: number
}

// export type OverallPointsUser = User & { overall_points: number }

export type PointType =
    | 'chat_points'
    | 'voice_points'
    | 'mely_points'
    | 'overall_points'

export interface IUserVoicePointProps {
    joinedVoiceTime: Date | null
    onMicTime: Date | null
    onStreamTime: Date | null
    onVideo: Date | null
}

@Subscriber()
export class UserSubscriber implements EventSubscriber<User> {
    getSubscribedEntities(): EntityName<User>[] {
        return [User]
    }

    async afterUpdate({
        entity,
        em,
        changeSet,
    }: EventArgs<User>): Promise<void> {
        // emit rank up event
        if (changeSet && changeSet.type === ChangeSetType.UPDATE) {
            const user = em
                .getRepository(User)
                .getOverallPointsUser(entity) as EntityData<User>

            // Emit 'rankUp' event when user's overall points reached a specific amount
            if (
                changeSet.originalEntity &&
                user.overall_points &&
                changeSet.originalEntity.overall_points &&
                user.overall_points != changeSet.originalEntity.overall_points
                // && checkRank(user.overall_points)
            ) {
                const eventManager = await resolveDependency(EventManager)
                /**
                 * @param {EntityData<User>} oldUser
                 * @param {EntityData<User>} newUser
                 */
                eventManager.emit('rankUp', changeSet.originalEntity, user)
            }

            if (
                changeSet.originalEntity &&
                JSON.stringify(changeSet.originalEntity) !==
                    JSON.stringify(user)
            ) {
                const logger = await resolveDependency(Logger)
                for (const prop in user) {
                    if (
                        !prop.includes('points') ||
                        prop.includes('overall_points')
                    ) {
                        continue
                    }

                    const pointType = prop as PointType

                    const calc = Math.round(
                        (user[pointType] || 0) -
                            (changeSet.originalEntity[pointType] || 0)
                    )

                    if (calc === 0) continue

                    logger.log(
                        `${calc > 0 ? '+' : ''}${calc} ${pointType} ${
                            calc > 0 ? 'for' : 'of'
                        } ${user.id}`,
                        'info',
                        true
                    )
                }
            }
        }
    }
}
