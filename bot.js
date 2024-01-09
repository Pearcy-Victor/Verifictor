const { Client, ActionRowBuilder, InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, GatewayIntentBits, REST, Routes, PermissionFlagsBits, SlashCommandChannelOption, SlashCommandStringOption, SlashCommandRoleOption, SlashCommandBooleanOption } = require("discord.js")
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
    .addChannelOption(
      new SlashCommandChannelOption()
        .setName("log")
        .setDescription("The channel which logs each interaction made by the user in verification")
    )
    .addBooleanOption(
      new SlashCommandBooleanOption()
        .setName("case-insensitivity")
        .setDescription("Disables case sensitive matching for the password.")
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
              const log = inter.options.get("log").value || false
              const sens = inter.options.get("case-insensitivity").value || false
              guild["password"] = newPassword
              guild["role"] = setRole
              if (log) {guild["log"] = log}
              guild["nocase"] = sens
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
            let password = guild["password"]
            const role = guild["role"]
            const log = await inter.member.guild.channels.fetch(guild["log"]) || false
            let response = inter.fields.getTextInputValue("input").trim();
            const owner = await inter.member.guild.fetchOwner()
            const sens = guild["nocase"]
            if (sens) {
              password = password.toLowerCase()
              response = response.toLowerCase()
            }
            if (response === password) {
                if (inter.guild.members.me.roles.highest.position < inter.guild.roles.resolve(role).position) {
                    inter.reply({
                        content: `The role I want to give you is higher than mine, please contact ${owner} to fix it!`,
                        ephemeral: true
                    })
                    return
                } else {
                    if (log) {
                      log.send(`${inter.member.displayName} (${inter.member.id}) successfully verified into the server.`)
                    }
                    inter.member.roles.add(role)
                    inter.reply({
                        content: "Success!",
                        ephemeral: true
                    })
                }
            } else {
              if (log) {
                log.send(`${inter.member.displayName} (${inter.member.id}) failed to verified into the server. (They entered:"${response}")`)
              }
                inter.reply({
                    content: `The password is incorrect, please try again or contact ${owner} for the password!`,
                    ephemeral: true
                })
            }
        }
    }
})


client.once("ready", () => {  
  const rest = new REST({version:'9'}).setToken(Token)
  try {
    client.guilds.cache.forEach(guild => {
      rest.put(Routes.applicationGuildCommands(client.application.id, guild.id),{body: cmds})
    })
  } catch(err) {
      console.error(err)
  }
    console.log("Verifictor activated.")
})

client.on("rateLimit", (data) => {
    if (data.timeout > 10000) {
        process.kill(1)
    }
})

ping()
client.login(Token);