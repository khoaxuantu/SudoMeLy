import {
    Entity,
    EntityRepositoryType,
    Enum,
    ManyToMany,
    ManyToOne,
    PrimaryKey,
    Property,
    Ref,
} from '@mikro-orm/core'
import { EntityRepository } from '@mikro-orm/sqlite'
import { User } from './User'
import { TransactionType } from '@constants'

// ===========================================
// ================= Entity ==================
// ===========================================

@Entity({ customRepository: () => TransactionRepository })
export class Transaction {
    [EntityRepositoryType]?: TransactionRepository

    @PrimaryKey({ autoincrement: true })
    id: number

    @ManyToOne(() => User, { ref: true })
    sender: Ref<User>

    @ManyToOne(() => User, { ref: true })
    receiver: Ref<User>

    @Enum(() => TransactionType)
    type!: TransactionType

    @Property()
    amount: number

    @Property()
    message: string

    @Property()
    createdAt: Date = new Date()
}

// ===========================================
// =========== Custom Repository =============
// ===========================================

export class TransactionRepository extends EntityRepository<Transaction> {}
