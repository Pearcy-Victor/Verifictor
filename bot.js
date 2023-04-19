const { Client, ActionRowBuilder, InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, GatewayIntentBits, REST, Routes, PermissionFlagsBits, ApplicationCommandOptionType, SlashCommandStringOption, SlashCommandRoleOption} = require("discord.js")
const fs = require("fs")
const ping = require("./server")

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
})

const Token = process.env.TOKEN

const cmds = [
    new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify here to gain access to the Discord server!")
    .toJSON(),
    new SlashCommandBuilder()
    .setName("set")
    .setDescription("Verify here to gain access to the Discord server!")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(
        new SlashCommandStringOption()
            .setName("password")
            .setDescription("Enter the password for verification")
            .setRequired(true)
    )
    .addRoleOption(
        new SlashCommandRoleOption()
        .setName("role")
        .setDescription("The role given to people who entered the password correctly")
        .setRequired(true)
    )
    .toJSON(),
]

client.on("interactionCreate", async (inter) => {
    if (inter.isChatInputCommand()) {
        switch (inter.commandName) {
            case "verify":
                const g = JSON.parse(fs.readFileSync("./guilds.json"))[inter.commandGuildId]
                if (!g) {
                    inter.reply({
                        content: "The guild has not set up a password yet, please contact the admin.",
                        ephemeral: true
                    })
                    break
                }
                const modal = new ModalBuilder()
                    .setCustomId("verifier")
                    .setTitle("Verification Password")
                    .addComponents([
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId('input')
                                    .setLabel("Enter the Discord server password here")
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder("Enter password here")
                                    .setRequired(true)
                            )
                    ])
        
                    await inter.showModal(modal)
                break
            case "set":
                
                let guilds = JSON.parse(fs.readFileSync('./guilds.json'))
                let guild = guilds[inter.commandGuildId] || {}
                const newPassword = inter.options.get("password").value
                const setRole = inter.options.get("role").value
                guild["password"] = newPassword
                guild["role"] = setRole
                guilds[inter.commandGuildId] = guild
                fs.writeFileSync("./guilds.json",JSON.stringify(guilds, null, "\t"))
                
                inter.reply({
                    content: "Set up is done.",
                    ephemeral: true
                })
                break
        }
    }

    if (inter.type === InteractionType.ModalSubmit) {
        if (inter.customId === "verifier") {
            const guild = JSON.parse(fs.readFileSync("./guilds.json"))[inter.guildId]
            const password = guild["password"]
            const role = guild["role"]
            const response = inter.fields.getTextInputValue("input");
            const owner = await inter.member.guild.fetchOwner()
            if (response === password) {
                if (inter.guild.members.me.roles.highest.position < inter.guild.roles.resolve(role).position) {
                    inter.reply({
                        content: `The role I want to give you is higher than mine, please contact ${owner} to fix it!`,
                        ephemeral: true
                    })
                    return
                } else {
                    inter.member.roles.add(role)
                    inter.reply({
                        content: "Success!",
                        ephemeral: true
                    })
                }
            } else {
                inter.reply({
                    content: `The password is incorrect, please contact ${owner} for the password!`,
                    ephemeral: true
                })
            }
        }
    }
})

const clientId = '1098049777779880098';
const guildId = '313342096218128384';

const rest = new REST({version:'9'}).setToken(Token)
try {
    rest.put(Routes.applicationGuildCommands(clientId, guildId),{body: cmds});
} catch(err) {
    console.error(err)
}

client.once("ready", () => {
    console.log("Verifictor activated.")
})

client.on("rateLimit", (data) => {
    if (data.timeout > 10000) {
        process.kill(1)
    }
})

ping()
client.login(Token);