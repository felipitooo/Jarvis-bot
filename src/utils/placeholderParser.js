const { EmbedBuilder } = require('discord.js');

const NAMED_COLORS = {
  blue: 0x3498DB,
  green: 0x2ECC71,
  red: 0xE74C3C,
  yellow: 0xF1C40F,
  gold: 0xF1C40F,
  orange: 0xE67E22,
  purple: 0x9B59B6,
  dark: 0x2C2F33,
  blurple: 0x5865F2,
  pink: 0xE91E63,
  white: 0xFFFFFF,
  cyan: 0x00BCD4
};

function resolveColor(input) {
  if (!input) return 0x5865F2;
  const clean = String(input).trim().toLowerCase();
  if (NAMED_COLORS[clean]) return NAMED_COLORS[clean];
  if (clean.startsWith('#')) {
    const val = parseInt(clean.slice(1), 16);
    return isNaN(val) ? 0x5865F2 : val;
  }
  if (clean.startsWith('0x')) {
    const val = parseInt(clean, 16);
    return isNaN(val) ? 0x5865F2 : val;
  }
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0x5865F2 : num;
}

/**
 * Parses and replaces placeholders in a custom command response string.
 *
 * @param {string} rawTemplate
 * @param {object} context
 * @param {import('discord.js').Guild} [context.guild]
 * @param {import('discord.js').GuildMember} [context.member]
 * @param {import('discord.js').User} [context.author]
 * @param {import('discord.js').TextChannel} [context.channel]
 * @param {import('discord.js').GuildMember} [context.targetMember]
 * @param {import('discord.js').User} [context.targetUser]
 * @param {string[]} [context.args]
 * @param {object} [context.economyData]
 * @param {object} [context.xpData]
 * @returns {{
 *   content: string,
 *   isEmbed: boolean,
 *   embed: EmbedBuilder|null,
 *   shouldDelete: boolean,
 *   sendDm: boolean,
 *   shouldReply: boolean
 * }}
 */
function parsePlaceholders(rawTemplate, context = {}) {
  let template = String(rawTemplate || '');

  const {
    guild,
    member,
    author = member?.user,
    channel,
    targetMember,
    targetUser = targetMember?.user || null,
    args = [],
    economyData = null,
    xpData = null
  } = context;

  // 1. Action Modifiers Detection
  let shouldDelete = false;
  let sendDm = false;
  let shouldReply = false;

  if (/\{delete\}/i.test(template)) {
    shouldDelete = true;
    template = template.replace(/\{delete\}/gi, '');
  }
  if (/\{dm\}/i.test(template)) {
    sendDm = true;
    template = template.replace(/\{dm\}/gi, '');
  }
  if (/\{reply\}/i.test(template)) {
    shouldReply = true;
    template = template.replace(/\{reply\}/gi, '');
  }

  // 2. Random / Dynamic Tags Replacement
  // {choose:a;b;c} or {choose:a|b|c} or {random:a;b;c}
  template = template.replace(/\{(?:choose|random):([^}]+)\}/gi, (_, choicesStr) => {
    const delimiter = choicesStr.includes(';') ? ';' : '|';
    const choices = choicesStr.split(delimiter).map(c => c.trim()).filter(Boolean);
    if (choices.length === 0) return '';
    return choices[Math.floor(Math.random() * choices.length)];
  });

  // {random.number:min;max} or {randnum:min;max} or {randnum:min-max}
  template = template.replace(/\{(?:random\.number|randnum):(\d+)[;\-,](\d+)\}/gi, (_, minStr, maxStr) => {
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    if (isNaN(min) || isNaN(max)) return '0';
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return String(Math.floor(Math.random() * (hi - lo + 1)) + lo);
  });

  // {coinflip} or {caraoucoroa}
  template = template.replace(/\{(?:coinflip|caraoucoroa)\}/gi, () => {
    return Math.random() < 0.5 ? '🪙 Cara' : '🪙 Coroa';
  });

  // {roll} or {dado}
  template = template.replace(/\{(?:roll|dado)\}/gi, () => {
    const dice = ['⚀ 1', '⚁ 2', '⚂ 3', '⚃ 4', '⚄ 5', '⚅ 6'];
    return dice[Math.floor(Math.random() * dice.length)];
  });

  // {percent} or {porcentagem}
  template = template.replace(/\{(?:percent|porcentagem)\}/gi, () => {
    return `${Math.floor(Math.random() * 101)}%`;
  });

  // {random.user}
  template = template.replace(/\{random\.user\}/gi, () => {
    if (guild?.members?.cache && guild.members.cache.size > 0) {
      const nonBots = Array.from(guild.members.cache.values()).filter(m => !m.user.bot);
      const pool = nonBots.length > 0 ? nonBots : Array.from(guild.members.cache.values());
      const picked = pool[Math.floor(Math.random() * pool.length)];
      return `<@${picked.id}>`;
    }
    return author ? `<@${author.id}>` : 'Alguém';
  });

  // 3. Date & Time Tags
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');
  const unixSec = Math.floor(now.getTime() / 1000);

  template = template
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{time\}/gi, timeStr)
    .replace(/\{year\}/gi, String(now.getFullYear()))
    .replace(/\{month\}/gi, String(now.getMonth() + 1).padStart(2, '0'))
    .replace(/\{day\}/gi, String(now.getDate()).padStart(2, '0'))
    .replace(/\{timestamp\.relative\}/gi, `<t:${unixSec}:R>`)
    .replace(/\{timestamp\}/gi, `<t:${unixSec}:f>`);

  // 4. Arguments Tags
  const fullArgs = args.join(' ');
  template = template
    .replace(/\{args\}/gi, fullArgs)
    .replace(/\{args\.count\}/gi, String(args.length));

  // Positional arguments: {arg:1}, {arg:2}, etc. and ranges {arg:1+}, {arg:2+}
  template = template.replace(/\{arg:(\d+)\+\}/gi, (_, idxStr) => {
    const idx = parseInt(idxStr, 10) - 1;
    return idx >= 0 && idx < args.length ? args.slice(idx).join(' ') : '';
  });

  template = template.replace(/\{arg:(\d+)\}/gi, (_, idxStr) => {
    const idx = parseInt(idxStr, 10) - 1;
    return idx >= 0 && idx < args.length ? args[idx] : '';
  });

  // 5. User / Author Tags
  if (author) {
    const userMention = `<@${author.id}>`;
    const username = author.username || 'Usuário';
    const displayName = member?.displayName || username;
    const userTag = author.tag || `${username}#0000`;
    const userAvatar = author.displayAvatarURL ? author.displayAvatarURL({ extension: 'png', size: 256 }) : '';
    const userCreatedAt = author.createdAt ? new Date(author.createdAt).toLocaleDateString('pt-BR') : 'N/A';
    const userJoinedAt = member?.joinedAt ? new Date(member.joinedAt).toLocaleDateString('pt-BR') : 'N/A';

    const rolesList = member?.roles?.cache
      ? Array.from(member.roles.cache.values()).filter(r => r.name !== '@everyone').map(r => r.name).join(', ')
      : '';
    const rolesCount = member?.roles?.cache ? member.roles.cache.size - 1 : 0;
    const topRole = member?.roles?.highest?.name || 'Membro';
    const topRoleColor = member?.roles?.highest?.hexColor || '#5865F2';

    template = template
      .replace(/\{user\}/gi, userMention)
      .replace(/\{username\}/gi, username)
      .replace(/\{user\.id\}/gi, author.id)
      .replace(/\{user\.mention\}/gi, userMention)
      .replace(/\{user\.name\}/gi, username)
      .replace(/\{user\.displayName\}/gi, displayName)
      .replace(/\{user\.display_name\}/gi, displayName)
      .replace(/\{user\.tag\}/gi, userTag)
      .replace(/\{user\.avatar\}/gi, userAvatar)
      .replace(/\{user\.created_at\}/gi, userCreatedAt)
      .replace(/\{user\.joined_at\}/gi, userJoinedAt)
      .replace(/\{user\.roles\}/gi, rolesList || 'Nenhum cargo')
      .replace(/\{user\.roles\.count\}/gi, String(Math.max(0, rolesCount)))
      .replace(/\{user\.top_role\}/gi, topRole)
      .replace(/\{user\.color\}/gi, topRoleColor);
  }

  // 6. Target User Tags
  const effTargetUser = targetUser || author;
  const effTargetMember = targetMember || member;
  if (effTargetUser) {
    const targetMention = `<@${effTargetUser.id}>`;
    const targetUsername = effTargetUser.username || 'Alvo';
    const targetDisplayName = effTargetMember?.displayName || targetUsername;
    const targetAvatar = effTargetUser.displayAvatarURL ? effTargetUser.displayAvatarURL({ extension: 'png', size: 256 }) : '';
    const targetCreatedAt = effTargetUser.createdAt ? new Date(effTargetUser.createdAt).toLocaleDateString('pt-BR') : 'N/A';
    const targetJoinedAt = effTargetMember?.joinedAt ? new Date(effTargetMember.joinedAt).toLocaleDateString('pt-BR') : 'N/A';
    const targetRoles = effTargetMember?.roles?.cache
      ? Array.from(effTargetMember.roles.cache.values()).filter(r => r.name !== '@everyone').map(r => r.name).join(', ')
      : '';

    template = template
      .replace(/\{target\}/gi, targetMention)
      .replace(/\{target\.mention\}/gi, targetMention)
      .replace(/\{target\.username\}/gi, targetUsername)
      .replace(/\{target\.name\}/gi, targetUsername)
      .replace(/\{target\.id\}/gi, effTargetUser.id)
      .replace(/\{target\.displayName\}/gi, targetDisplayName)
      .replace(/\{target\.display_name\}/gi, targetDisplayName)
      .replace(/\{target\.avatar\}/gi, targetAvatar)
      .replace(/\{target\.created_at\}/gi, targetCreatedAt)
      .replace(/\{target\.joined_at\}/gi, targetJoinedAt)
      .replace(/\{target\.roles\}/gi, targetRoles || 'Nenhum cargo');
  }

  // 7. Server / Guild Tags
  if (guild) {
    const serverName = guild.name || 'Servidor';
    const serverId = guild.id;
    const serverMembers = String(guild.memberCount || 1);
    const serverIcon = guild.iconURL ? (guild.iconURL({ extension: 'png', size: 256 }) || '') : '';
    const ownerId = guild.ownerId || '';
    const ownerMention = ownerId ? `<@${ownerId}>` : 'Dono';
    const boosts = String(guild.premiumSubscriptionCount || 0);
    const boostLevel = String(guild.premiumTier || 0);
    const serverCreatedAt = guild.createdAt ? new Date(guild.createdAt).toLocaleDateString('pt-BR') : 'N/A';
    const channelsCount = String(guild.channels?.cache?.size || 0);
    const rolesCount = String(guild.roles?.cache?.size || 0);

    template = template
      .replace(/\{server\}/gi, serverName)
      .replace(/\{guild\}/gi, serverName)
      .replace(/\{server\.name\}/gi, serverName)
      .replace(/\{guild\.name\}/gi, serverName)
      .replace(/\{server\.id\}/gi, serverId)
      .replace(/\{guild\.id\}/gi, serverId)
      .replace(/\{server\.members\}/gi, serverMembers)
      .replace(/\{guild\.members\}/gi, serverMembers)
      .replace(/\{members\}/gi, serverMembers)
      .replace(/\{server\.icon\}/gi, serverIcon)
      .replace(/\{guild\.icon\}/gi, serverIcon)
      .replace(/\{server\.owner\}/gi, ownerMention)
      .replace(/\{guild\.owner\}/gi, ownerMention)
      .replace(/\{server\.owner\.id\}/gi, ownerId)
      .replace(/\{guild\.owner\.id\}/gi, ownerId)
      .replace(/\{server\.boosts\}/gi, boosts)
      .replace(/\{server\.boost_level\}/gi, boostLevel)
      .replace(/\{server\.created_at\}/gi, serverCreatedAt)
      .replace(/\{server\.channels\.count\}/gi, channelsCount)
      .replace(/\{server\.roles\.count\}/gi, rolesCount);
  }

  // 8. Channel Tags
  if (channel) {
    const chanMention = `<#${channel.id}>`;
    const chanName = channel.name || 'canal';
    const chanId = channel.id;
    const chanTopic = channel.topic || '';

    template = template
      .replace(/\{channel\}/gi, chanMention)
      .replace(/\{channel\.name\}/gi, chanName)
      .replace(/\{channel\.id\}/gi, chanId)
      .replace(/\{channel\.topic\}/gi, chanTopic);
  }

  // 9. Economy & XP Tags
  const walletCoins = economyData?.walletBalance !== undefined ? String(economyData.walletBalance) : '0';
  const bankCoins = economyData?.bankBalance !== undefined ? String(economyData.bankBalance) : '0';
  const totalCoins = economyData?.totalBalance !== undefined ? String(economyData.totalBalance) : walletCoins;

  const currentLevel = xpData?.level !== undefined ? String(xpData.level) : '1';
  const currentXp = xpData?.currentXp !== undefined ? String(xpData.currentXp) : '0';

  template = template
    .replace(/\{user\.coins\}/gi, walletCoins)
    .replace(/\{coins\}/gi, walletCoins)
    .replace(/\{saldo\}/gi, walletCoins)
    .replace(/\{user\.bank\}/gi, bankCoins)
    .replace(/\{bank\}/gi, bankCoins)
    .replace(/\{banco\}/gi, bankCoins)
    .replace(/\{user\.networth\}/gi, totalCoins)
    .replace(/\{total_coins\}/gi, totalCoins)
    .replace(/\{user\.level\}/gi, currentLevel)
    .replace(/\{level\}/gi, currentLevel)
    .replace(/\{nivel\}/gi, currentLevel)
    .replace(/\{user\.xp\}/gi, currentXp)
    .replace(/\{xp\}/gi, currentXp);

  // 10. Embed Parsing
  const isEmbed = /\{embed\}/i.test(template);
  let embed = null;

  if (isEmbed) {
    // Strip {embed} trigger
    template = template.replace(/\{embed\}/gi, '');

    embed = new EmbedBuilder().setTimestamp();

    // {title:...}
    template = template.replace(/\{title:([^}]+)\}/gi, (_, val) => {
      embed.setTitle(val.trim());
      return '';
    });

    // {url:...}
    template = template.replace(/\{url:([^}]+)\}/gi, (_, val) => {
      embed.setURL(val.trim());
      return '';
    });

    // {color:...}
    template = template.replace(/\{color:([^}]+)\}/gi, (_, val) => {
      embed.setColor(resolveColor(val));
      return '';
    });

    // Default color if not set
    if (!embed.data.color) {
      embed.setColor(0x5865F2);
    }

    // {description:...}
    let explicitDesc = null;
    template = template.replace(/\{description:([^}]+)\}/gi, (_, val) => {
      explicitDesc = val.trim();
      return '';
    });

    // {field:Name;Value;inline} or {field:Name;Value}
    template = template.replace(/\{field:([^;]+);([^;}]+)(?:;([^}]+))?\}/gi, (_, fName, fVal, fInline) => {
      const isInline = fInline ? /true|yes|1|sim/i.test(fInline.trim()) : false;
      embed.addFields({ name: fName.trim(), value: fVal.trim(), inline: isInline });
      return '';
    });

    // {footer:Text;IconURL} or {footer:Text}
    template = template.replace(/\{footer:([^;}]+)(?:;([^}]+))?\}/gi, (_, fText, fIcon) => {
      const footerObj = { text: fText.trim() };
      if (fIcon && fIcon.trim().startsWith('http')) footerObj.iconURL = fIcon.trim();
      embed.setFooter(footerObj);
      return '';
    });

    // {image:URL}
    template = template.replace(/\{image:([^}]+)\}/gi, (_, val) => {
      const cleanUrl = val.trim();
      if (cleanUrl.startsWith('http')) embed.setImage(cleanUrl);
      return '';
    });

    // {thumbnail:URL}
    template = template.replace(/\{thumbnail:([^}]+)\}/gi, (_, val) => {
      const cleanUrl = val.trim();
      if (cleanUrl.startsWith('http')) embed.setThumbnail(cleanUrl);
      return '';
    });

    // {author:Name;IconURL} or {author:Name}
    template = template.replace(/\{author:([^;}]+)(?:;([^}]+))?\}/gi, (_, aName, aIcon) => {
      const authorObj = { name: aName.trim() };
      if (aIcon && aIcon.trim().startsWith('http')) authorObj.iconURL = aIcon.trim();
      embed.setAuthor(authorObj);
      return '';
    });

    // Remaining text becomes the description if explicit description wasn't set or appends
    const remainingText = template.trim();
    if (explicitDesc) {
      embed.setDescription(explicitDesc);
    } else if (remainingText) {
      embed.setDescription(remainingText);
    }
  }

  // Support {emoji:nome} shorthand
  template = template.replace(/\{emoji:([^}]+)\}/gi, ':$1:');

  // Custom & External Emojis Resolution (Meu Servidor & Outros Servidores)
  const client = guild?.client;
  if (client) {
    const { resolveCustomEmojis } = require('./emojiHelper');
    template = resolveCustomEmojis(template, client, guild?.id);
    if (isEmbed && embed) {
      if (embed.data.title) embed.data.title = resolveCustomEmojis(embed.data.title, client, guild?.id);
      if (embed.data.description) embed.data.description = resolveCustomEmojis(embed.data.description, client, guild?.id);
      if (embed.data.footer?.text) embed.data.footer.text = resolveCustomEmojis(embed.data.footer.text, client, guild?.id);
      if (embed.data.author?.name) embed.data.author.name = resolveCustomEmojis(embed.data.author.name, client, guild?.id);
      if (Array.isArray(embed.data.fields)) {
        embed.data.fields = embed.data.fields.map(f => ({
          ...f,
          name: resolveCustomEmojis(f.name, client, guild?.id),
          value: resolveCustomEmojis(f.value, client, guild?.id)
        }));
      }
    }
  }

  return {
    content: template.trim(),
    isEmbed,
    embed,
    shouldDelete,
    sendDm,
    shouldReply
  };
}

/**
 * Returns documentation dictionary of all supported placeholders.
 */
function getPlaceholdersDocumentation() {
  return [
    {
      category: '👤 Usuário / Autor',
      tags: [
        { tag: '{user}', desc: 'Menciona o autor do comando (<@id>)' },
        { tag: '{username}', desc: 'Nome de usuário do autor (ex: João)' },
        { tag: '{user.id}', desc: 'ID numérico do autor no Discord' },
        { tag: '{user.displayName}', desc: 'Apelido do autor neste servidor' },
        { tag: '{user.avatar}', desc: 'Link da imagem de perfil do autor' },
        { tag: '{user.created_at}', desc: 'Data de criação da conta do autor' },
        { tag: '{user.joined_at}', desc: 'Data em que o autor entrou no servidor' },
        { tag: '{user.roles}', desc: 'Lista de cargos que o autor possui' },
        { tag: '{user.top_role}', desc: 'Nome do cargo mais alto do autor' }
      ]
    },
    {
      category: '🎯 Alvo / Mencionado (@usuario)',
      tags: [
        { tag: '{target}', desc: 'Menciona o membro citado no comando' },
        { tag: '{target.username}', desc: 'Nome de usuário do membro citado' },
        { tag: '{target.id}', desc: 'ID do membro citado' },
        { tag: '{target.avatar}', desc: 'Link da foto de perfil do membro citado' },
        { tag: '{target.joined_at}', desc: 'Data de entrada do membro no servidor' }
      ]
    },
    {
      category: '🏠 Servidor & Canal',
      tags: [
        { tag: '{server}', desc: 'Nome do servidor' },
        { tag: '{server.id}', desc: 'ID do servidor' },
        { tag: '{server.members}', desc: 'Quantidade total de membros' },
        { tag: '{server.icon}', desc: 'Link do ícone do servidor' },
        { tag: '{server.owner}', desc: 'Menciona o dono do servidor' },
        { tag: '{server.boosts}', desc: 'Número de impulsos/boosts do servidor' },
        { tag: '{channel}', desc: 'Menciona o canal atual (<#id>)' },
        { tag: '{channel.name}', desc: 'Nome do canal atual' }
      ]
    },
    {
      category: '💬 Argumentos Digitados',
      tags: [
        { tag: '{args}', desc: 'Todos os argumentos digitados após o comando' },
        { tag: '{arg:1}', desc: '1º argumento digitado' },
        { tag: '{arg:2}', desc: '2º argumento digitado' },
        { tag: '{arg:1+}', desc: 'Do 1º argumento até o final' },
        { tag: '{arg:2+}', desc: 'Do 2º argumento até o final' }
      ]
    },
    {
      category: '🎲 Sorteios & Aleatoriedade',
      tags: [
        { tag: '{choose:opcao1;opcao2;opcao3}', desc: 'Escolhe aleatoriamente uma das opções' },
        { tag: '{random.number:min;max}', desc: 'Número aleatório entre min e max (ex: {random.number:1;100})' },
        { tag: '{coinflip}', desc: 'Sorteia 🪙 Cara ou 🪙 Coroa' },
        { tag: '{roll}', desc: 'Rola um dado de 6 lados (🎲 1 a 6)' },
        { tag: '{percent}', desc: 'Gera uma porcentagem de 0% a 100%' },
        { tag: '{random.user}', desc: 'Escolhe aleatoriamente um membro do servidor' }
      ]
    },
    {
      category: '💰 Economia & Nível',
      tags: [
        { tag: '{coins}', desc: 'Saldo de moedas na carteira do autor' },
        { tag: '{bank}', desc: 'Saldo de moedas no banco do autor' },
        { tag: '{level}', desc: 'Nível atual do autor no servidor' },
        { tag: '{xp}', desc: 'Pontos de XP acumulados pelo autor' }
      ]
    },
    {
      category: '📅 Data & Hora',
      tags: [
        { tag: '{date}', desc: 'Data atual formatada (DD/MM/AAAA)' },
        { tag: '{time}', desc: 'Hora atual formatada (HH:MM:SS)' },
        { tag: '{timestamp.relative}', desc: 'Horário relativo do Discord (ex: há alguns segundos)' }
      ]
    },
    {
      category: '⚙️ Gatilho & Prefixo (Na Criação)',
      tags: [
        { tag: '{semprefixo}', desc: 'Faz o comando acionar no chat só de falar o nome, sem prefixo' },
        { tag: '{prefix:!}', desc: 'Define um prefixo exclusivo para este comando (ex: !, ?, $)' },
        { tag: '{contem}', desc: 'Aciona o comando se o nome for falado em qualquer parte da mensagem' },
        { tag: '{exato}', desc: 'Aciona o comando apenas se a mensagem for idêntica ao nome dele' }
      ]
    },
    {
      category: '⚡ Ações Especiais',
      tags: [
        { tag: '{delete}', desc: 'Apaga a mensagem que chamou o comando' },
        { tag: '{dm}', desc: 'Envia a resposta na DM do usuário em vez do canal' },
        { tag: '{reply}', desc: 'Responde referenciando a mensagem do usuário' }
      ]
    },
    {
      category: '🎨 Criação de Embeds',
      tags: [
        { tag: '{embed}', desc: 'Ativa o modo Embed' },
        { tag: '{title:Título}', desc: 'Define o título da embed' },
        { tag: '{color:#HEX ou blue,red,gold}', desc: 'Define a cor lateral da embed' },
        { tag: '{description:Texto}', desc: 'Define a descrição da embed' },
        { tag: '{field:Nome;Valor;inline}', desc: 'Adiciona um campo formatado na embed' },
        { tag: '{footer:Texto;IconURL}', desc: 'Define o rodapé da embed' },
        { tag: '{image:URL}', desc: 'Define uma imagem grande no corpo da embed' },
        { tag: '{thumbnail:URL}', desc: 'Define uma miniatura no canto superior direito' },
        { tag: '{author:Nome;IconURL}', desc: 'Define o autor no topo da embed' }
      ]
    }
  ];
}

/**
 * Extracts command creation directives (prefix, prefixless, match_mode) from response text.
 * @param {string} rawText
 * @returns {{ cleanedText: string, requirePrefix: number, customPrefix: string|null, matchMode: string }}
 */
function extractCreationDirectives(rawText) {
  let text = String(rawText || '');
  let requirePrefix = 1;
  let customPrefix = null;
  let matchMode = 'starts_with';

  if (/\{(?:semprefixo|noprefix)\}/i.test(text)) {
    requirePrefix = 0;
    text = text.replace(/\{(?:semprefixo|noprefix)\}/gi, '');
  }

  const prefMatch = text.match(/\{(?:prefix|prefixo):([^}]+)\}/i);
  if (prefMatch) {
    const p = prefMatch[1].trim();
    if (['sem', 'nenhum', 'none', 'false', '0'].includes(p.toLowerCase())) {
      requirePrefix = 0;
      customPrefix = null;
    } else {
      customPrefix = p.slice(0, 5);
      requirePrefix = 1;
    }
    text = text.replace(prefMatch[0], '');
  }

  if (/\{(?:contem|contains)\}/i.test(text)) {
    matchMode = 'contains';
    requirePrefix = 0;
    text = text.replace(/\{(?:contem|contains)\}/gi, '');
  } else if (/\{(?:exato|exact)\}/i.test(text)) {
    matchMode = 'exact';
    requirePrefix = 0;
    text = text.replace(/\{(?:exato|exact)\}/gi, '');
  } else if (/\{(?:inicia|comeca|startswith)\}/i.test(text)) {
    matchMode = 'starts_with';
    requirePrefix = 0;
    text = text.replace(/\{(?:inicia|comeca|startswith)\}/gi, '');
  }

  return {
    cleanedText: text.trim(),
    requirePrefix,
    customPrefix,
    matchMode
  };
}

module.exports = {
  parsePlaceholders,
  extractCreationDirectives,
  getPlaceholdersDocumentation,
  resolveColor
};
