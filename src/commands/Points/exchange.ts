import { Category } from "@discordx/utilities";
import { PointManager } from "@services";
import { Discord, Slash, SlashChoice, SlashOption } from "@decorators";
import { ApplicationCommandOptionType, type CommandInteraction } from "discord.js";
import { PointType } from "@entities";
import { injectable } from "tsyringe";
import { simpleSuccessEmbed, simpleErrorEmbed, syncUser, shortPointType } from "@utils/functions";


@Discord()
@injectable()
@Category("Points")
export default class ExchangePoints {
    constructor(
        private pm: PointManager
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
        const res = await this.pm.exchange(interaction.user, fromPointType, toPointType, amount);
        if(res.success){
            simpleSuccessEmbed(interaction, res.message);
        }else{
            simpleErrorEmbed(interaction, res.message, true);
        }
    }
}
