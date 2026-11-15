const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enquete')
    .setDescription('Cria uma votação/enquete interativa com reações rápidas.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt.setName('pergunta')
        .setDescription('Pergunta da enquete')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opcao1')
        .setDescription('Primeira opção')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opcao2')
        .setDescription('Segunda opção')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opcao3')
        .setDescription('Terceira opção (opcional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('opcao4')
        .setDescription('Quarta opção (opcional)')
        .setRequired(false)
    ),

  async execute(interaction, context) {
    const { identityService } = context;
    const guild = interaction.guild;
    const aiName = identityService.getDisplayName(guild.id);

    const pergunta = interaction.options.getString('pergunta');
    const op1 = interaction.options.getString('opcao1');
    const op2 = interaction.options.getString('opcao2');
    const op3 = interaction.options.getString('opcao3');
    const op4 = interaction.options.getString('opcao4');

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const options = [op1, op2, op3, op4].filter(Boolean);

    let desc = '';
    options.forEach((op, idx) => {
      desc += `${emojis[idx]} **${op}**\n\n`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 Enquete: ${pergunta}`)
      .setDescription(desc)
      .setFooter({ text: `${aiName} • Votação iniciada por ${interaction.user.username}` })
      .setTimestamp();

    const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

    // React with option numbers
    for (let i = 0; i < options.length; i++) {
      await reply.react(emojis[i]).catch(() => {});
    }
  }
};
