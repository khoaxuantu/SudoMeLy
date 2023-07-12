import { GuildMember } from "discord.js";
import { codeBlock } from "discord.js";

interface HelloWorldTemplate {
    lang: string
    prefix: string
    suffix: string
}

const helloWorldTemplates: HelloWorldTemplate[] = require('./helloWorldTemplates.json');


export default function generateHelloWorld (member: GuildMember) {
    const template = helloWorldTemplates[Math.floor(Math.random()*helloWorldTemplates.length)];
    return codeBlock(template.lang, template.prefix + member.displayName + template.suffix);
}