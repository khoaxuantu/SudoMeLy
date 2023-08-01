import { Category } from "@discordx/utilities";
import { Database } from "@services";
import { Discord, SlashGroup, Slash, SlashChoice, SlashOption } from "@decorators";
import { ApplicationCommandOptionType, type CommandInteraction } from "discord.js";
import { Guild, User as UserEntity, PointType } from "@entities";
import { injectable } from "tsyringe";
import { simpleSuccessEmbed, simpleErrorEmbed, syncUser, shortPointType } from "@utils/functions";


@Discord()
@injectable()
@Category("Points")
export default class ExchangePoints {
    constructor(
        private db: Database
    ){}

    @Slash({
        name: "exchange",
        description: "Đổi điểm"
    })
    async exchangePoint(
        @SlashChoice({ name: 'Chat', value: 'chat_points' })
        @SlashChoice({ name: 'Voice', value: 'voice_points' })
        @SlashChoice({ name: 'MeLy', value: 'mely_points' })
        @SlashOption({
            name: 'from',
            description: "Loại điểm dùng để đổi",
            type: ApplicationCommandOptionType.String,
            required: true,
        })
        fromPointType: PointType,
        @SlashOption({
            name: 'amount',
            description: "Số lượng điểm muốn dùng",
            type: ApplicationCommandOptionType.Integer,
            minValue: 1,
            required: true,
        })
        amount: number,
        @SlashChoice({ name: 'Chat', value: 'chat_points' })
        @SlashChoice({ name: 'Voice', value: 'voice_points' })
        @SlashChoice({ name: 'MeLy', value: 'mely_points' })
        @SlashOption({
            name: 'to',
            description: "Loại điểm muốn đổi ra",
            type: ApplicationCommandOptionType.String,
            required: true,
        })
        toPointType: PointType,
        interaction: CommandInteraction
    ){
        // if(amount <= 0){
        //     return simpleErrorEmbed(interaction, "Lượng điểm phải là số dương", true);
        // }
        if(fromPointType === toPointType){
            return simpleSuccessEmbed(interaction, "Không có gì thay đổi");
        }
        if(fromPointType !== 'mely_points' && toPointType !== 'mely_points'){
            return simpleErrorEmbed(interaction, "Chỉ hỗ trợ đổi từ MP sang (CP, VP) và ngược lại", true);
        }
        syncUser(interaction.user);
        const userData = await this.db.get(UserEntity).findOne({id: interaction.user.id});
        if(!userData){
            return simpleErrorEmbed(interaction, "Không tìm thấy dữ liệu", true);
        }
        const fromPoints = userData[fromPointType];
        if(fromPoints < amount){
            return simpleErrorEmbed(interaction, "Điểm không đủ", true);
        }
        // console.log(amount);
        const rate = this.getRate(fromPointType, toPointType);
        const toPoints = Math.floor(Math.floor(amount) / rate);
        const remainFromPoints = Math.floor(fromPoints - toPoints * rate);
        userData[fromPointType] = remainFromPoints;
        userData[toPointType] += toPoints;
        await this.db.get(UserEntity).flush();
        simpleSuccessEmbed(interaction, `Đổi thành công ${toPoints} ${shortPointType(toPointType)}`);
    }

    private getRate(fromPointType: PointType, toPointType: PointType){
        if(fromPointType === toPointType || (fromPointType !== 'mely_points' && toPointType !== 'mely_points')) return 1;
        if(toPointType === 'mely_points') return 100;
        return 1 / 20;
    }
}
