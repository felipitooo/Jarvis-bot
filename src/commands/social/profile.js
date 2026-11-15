const { SlashCommandBuilder } = require('discord.js');
const { buildProfilePayload } = require('../../utils/profileBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Exibe o perfil completo do membro com nível, XP, economia, relacionamento e dados do servidor.')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('membro')
        .setDescription('Membro para consultar o perfil (opcional)')
        .setRequired(false)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} context
   */
  async execute(interaction, context) {
    const guild = interaction.guild;
    const targetUser = interaction.options.getUser('membro') || interaction.user;

    let member = null;
    try {
      member = await guild.members.fetch(targetUser.id);
    } catch {}

    const payload = await buildProfilePayload(guild, targetUser, member, context);
    await interaction.reply(payload);
  }
};
