import { UserRepository, User as UserEntity } from "@entities";
import { singleton } from "tsyringe";
import { Database } from "./Database";
import { ForumChannel, Message, MessageType, ThreadChannel, User, VoiceState } from "discord.js";
import { getRandomInt, shortPointType, syncUser } from "@utils/functions";
import { Loaded, type QBFilterQuery } from "@mikro-orm/core";
import { Injectable } from "@tsed/di";
import { Store } from "./Store";

export type PointType = 'chat_points' | 'voice_points' | 'mely_points' | 'overall_points'

export interface PointPackage {
    user: User | null
    type: PointType
    value: number
}

export interface TransactionResponse {
    success: boolean,
    message: string,
}

@Injectable()
class PointEvaluator {
    constructor(private store: Store) {}

    evaluateMessage(message: Message): number {
        if (message.content.length < 3 && !message.attachments.size) return 0

        // Base point
        let points = getRandomInt(2, 3)

        points += (message.content.length * 5).toString().length
        // If contains any attachments
        if (message.attachments.size) points += 1

        // If contains more than 5 spaces
        if (message.content.trim().split(/ +/g).length > 5) points += 1

        // If contains emojis
        if (
            message.cleanContent.match(
                /<a?:.+?:\d{18,19}>|\p{Extended_Pictographic}/gu
            )
        ) {
            points += 1
        }

        // If contains codeblocks
        if (message.cleanContent.match(/```.+?```/gisu)) {
            points += 1
        }

        // If mentioned others or replied to others
        if (
            message.cleanContent.match(/<@\d{18,19}>/g) ||
            (message.type === MessageType.Reply && message.reference)
        ) {
            points += 1
        }

        // If contains URLs
        if (message.cleanContent.match(/https?:\/\/[^.]+\.[^/]+/g)) {
            points += 1
        }

        // Round the point down so there will be no floating point in database
        return Math.floor(points / 3)
    }

    evaluateVoiceState(
        userData: Loaded<UserEntity, never>,
        oldState: VoiceState,
        newState: VoiceState
    ) {
        let points = 0

        const inVoiceChannel =
            oldState.channel !== null && newState.channel !== null

        const sameChannel =
            inVoiceChannel && oldState.channel === newState.channel

        // const switchChannel =
        //     inVoiceChannel && oldState.channel !== newState.channel

        const now = new Date()
        // User join a voice
        if (oldState.channel === null && newState.channel !== null) {
            // Start count in voice duration for user
            if (newState.mute === false) userData.onMicTime = now
            userData.joinedVoiceTime = now
        }

        // User turn off their mic
        if (sameChannel && oldState.mute === false && newState.mute === true) {
            if (userData.onMicTime) {
                const countInVoiceTime = this.getVoiceUnits(
                    userData.onMicTime,
                    now
                )

                const countMember = this.store
                    .get('voiceChannels')
                    .get(oldState.channel.id)

                if (countMember && countInVoiceTime > 0) {
                    points += Math.floor(
                        (countInVoiceTime * countMember.peakMembers) / 5
                    )
                }
            }

            userData.onMicTime = null
        }

        // User turn off their stream
        if (
            sameChannel &&
            oldState.streaming === true &&
            newState.streaming === false
        ) {
            // streamTime: + time / 10 -> tròn xuống.
            if (userData.onStreamTime) {
                points += Math.floor(
                    this.getVoiceUnits(userData.onStreamTime, now)
                )
            }

            userData.onStreamTime = null
        }

        // User turn off their video
        if (
            sameChannel &&
            oldState.selfVideo === true &&
            newState.selfVideo === false
        ) {
            // onVideo: + time / 10-> tròn xuống.
            if (userData.onVideoTime) {
                points += Math.floor(
                    this.getVoiceUnits(userData.onVideoTime, now) / 10
                )
            }

            userData.onVideoTime = null
        }

        // User turn on their mic after mute
        if (sameChannel && oldState.mute === true && newState.mute === false) {
            userData.onMicTime = now
        }

        // User turn on their stream
        if (
            sameChannel &&
            oldState.streaming === false &&
            newState.streaming === true
        ) {
            userData.onStreamTime = now
        }

        // User turn on their video
        if (
            sameChannel &&
            oldState.selfVideo === false &&
            newState.selfVideo === true
        ) {
            userData.onVideoTime = now
        }

        // User leave a voice
        if (oldState.channel !== null && newState.channel === null) {
            // 1 hour in any voice = 1 VP
            if (userData.joinedVoiceTime) {
                const countInVoiceTime = this.getVoiceUnits(
                    userData.joinedVoiceTime,
                    now
                )

                points += Math.floor(countInVoiceTime / 12)
            }

            // onMicTime: + time * max(mem) / 5 -> tròn xuống
            if (userData.joinedVoiceTime && userData.onMicTime) {
                const countMember = this.store
                    .get('voiceChannels')
                    .get(oldState.channel.id)

                if (countMember) {
                    const calcPoints = Math.floor(
                        (this.getVoiceUnits(userData.onMicTime, now) *
                            countMember.peakMembers) /
                            5
                    )

                    points += calcPoints
                }
            }

            // streamTime: + time / 10 -> tròn xuống.
            if (userData.joinedVoiceTime && userData.onStreamTime) {
                const calcPoints = Math.floor(
                    this.getVoiceUnits(userData.onStreamTime, now) / 10
                )

                points += calcPoints
            }

            // onVideo: + time / 10-> tròn xuống.
            if (userData.joinedVoiceTime && userData.onVideoTime) {
                const calcPoints = Math.floor(
                    this.getVoiceUnits(userData.onVideoTime, now) / 10
                )
                points += calcPoints
            }

            userData.onMicTime = null
            userData.onStreamTime = null
            userData.onVideoTime = null
            userData.joinedVoiceTime = null
        }
        
        return points
    }

    getVoiceUnits(before: Date, after: Date) {
        return Math.floor((after.getTime() - before.getTime()) / (5 * 60_000))
    }

    async evaluateClubThread(
        userDatas: (Loaded<UserEntity, never> | null)[],
        thread: ThreadChannel
    ) {
        const owner = userDatas.find((user) => user?.id === thread.ownerId)
        if (owner) {
            owner.mely_points += Math.floor(userDatas.length / 2)
        }
        const threadMessages = (await thread.messages.fetch()).filter(
            (message) => !message.author.bot
        )
        userDatas.forEach((user) => {
            if (user) {
                const points =
                    threadMessages.filter((m) => m.author.id === user.id).size /
                    50
                user.mely_points += Math.floor(points)
            }
        })
    }
}

@singleton()
export class PointManager extends PointEvaluator {
    private repo: UserRepository

    async initialize(db: Database) {
        this.repo = db.em.getRepository(UserEntity)
    }

    private getRate(fromPointType: PointType, toPointType: PointType){
        if(fromPointType === toPointType || (fromPointType !== 'mely_points' && toPointType !== 'mely_points')) return 1;
        if(toPointType === 'mely_points') return 100;
        return 1 / 20;
    }

    async getTop(pointPackage: PointPackage){
        const filter: QBFilterQuery<UserEntity> = {
            [pointPackage.type]: {
                $gt: pointPackage.value || 0
            }
        };
        return await this.repo.count(filter) + 1;
    }

    async getLeaderboard(type: PointType, limit: number){
        return await this.repo.find({}, {
            orderBy: {
                [type]: -1,
            },
            limit            
        })
    }

    async getUserData(user: User | null){
        if(!user) return null;
        await syncUser(user);
        return await this.repo.findOne(user.id);
    }

    async exchange(
        user: User | null,
        fromPointType: PointType,
        toPointType: PointType,
        amount: number
    ): Promise<TransactionResponse>{
        const userData = await this.getUserData(user);
        if(!userData){
            return {
                success: false,
                message: 'Không tìm thấy dữ liệu',
            }
        }
        const fromPoints = userData[fromPointType];
        if(fromPoints < amount){
            return {
                success: false,
                message: 'Điểm không đủ',
            }
        }
        const rate = this.getRate(fromPointType, toPointType);
        const toPoints = Math.floor(Math.floor(amount) / rate);
        const remainFromPoints = Math.floor(fromPoints - toPoints * rate);
        userData[fromPointType] = remainFromPoints;
        userData[toPointType] += toPoints;
        await this.repo.flush();
        return {
            success: true,
            message: `Đổi thành công ${toPoints} ${shortPointType(toPointType)}`,
        }
    }

    async add(pointPackage: PointPackage){
        if(!pointPackage.user) return;
        const userData = await this.getUserData(pointPackage.user);
        if(userData){
            const value = Math.floor(pointPackage.value);
            if (value === 0) return;
            userData[pointPackage.type] = Math.max(0, userData[pointPackage.type] + value);
            await this.repo.flush();
        }
    }

    async addMany(pointPackages: PointPackage[]) {
        const userDatas = await Promise.all(
            pointPackages.map((pkg) => this.getUserData(pkg.user))
        )
        for (let i = 0; i < userDatas.length; i++) {
            const userData = userDatas[i]
            if (userData) {
                const value = Math.floor(pointPackages[i].value)
                userData[pointPackages[i].type] = Math.max(
                    0,
                    userData[pointPackages[i].type] + value
                )
            }
        }
        await this.repo.flush()
    }

    async messageAdd(message: Message) {
        const user = message.member?.user
        if (!user) return
        const userData = await this.getUserData(user)
        if (userData) {
            const points = this.evaluateMessage(message)
            userData.chat_points += points
            await this.repo.flush()
        }
    }

    async voiceAdd(oldState: VoiceState, newState: VoiceState) {
        const user = oldState.member?.user || newState.member?.user
        if (!user) return
        const userData = await this.getUserData(user)
        if (userData) {
            const points = this.evaluateVoiceState(userData, oldState, newState)
            if (points > 0) {
                userData.voice_points += points
            }
            await this.repo.flush()
        }
    }

    async clubAdd(channel: ForumChannel) {
        const activeThreads = channel.threads.cache.filter(
            (thread) => thread.ownerId && !thread.archived
        )
        for (let key in activeThreads) {
            const thread = activeThreads.get(key)
            if (!thread) continue
            const users = thread.members.cache
                .filter((mem) => mem.user && !mem.user.bot)
                .map((mem) => mem.user)
            const userDatas = await Promise.all(
                users.map((user) => this.getUserData(user))
            )
            await this.evaluateClubThread(userDatas, thread)
        }
        await this.repo.flush()
    }

    async calcAndResetState() {
        const usersData = await this.repo.findAll()

        if (usersData) {
            const now = new Date()
            usersData.forEach((userData) => {
                let points = 0

                // 0.5 hour in any voice = 1 VP
                if (userData.joinedVoiceTime) {
                    const countInVoiceTime = this.getVoiceUnits(
                        userData.joinedVoiceTime,
                        now
                    )

                    points += Math.floor(countInVoiceTime / 6)
                }

                userData.onMicTime = null
                userData.onStreamTime = null
                userData.onVideoTime = null
                userData.joinedVoiceTime = null

                if (points > 0) {
                    userData.voice_points += points
                }
            })

            await this.repo.flush()
        }
    }
}
