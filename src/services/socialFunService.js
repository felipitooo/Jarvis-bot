const crypto = require('node:crypto');
const { logger } = require('../utils/logger');

const socialLogger = logger.forContext('SocialFunService');

const ANIME_KISS_GIFS = {
  "HETERO": [
    "https://cdn.nekos.life/kiss/kiss_001.gif",
    "https://cdn.nekos.life/kiss/kiss_002.gif",
    "https://cdn.nekos.life/kiss/kiss_003.gif",
    "https://cdn.nekos.life/kiss/kiss_004.gif",
    "https://cdn.nekos.life/kiss/kiss_005.gif",
    "https://cdn.nekos.life/kiss/kiss_006.gif",
    "https://cdn.nekos.life/kiss/kiss_007.gif",
    "https://cdn.nekos.life/kiss/kiss_008.gif",
    "https://cdn.nekos.life/kiss/kiss_009.gif",
    "https://cdn.nekos.life/kiss/kiss_010.gif",
    "https://cdn.nekos.life/kiss/kiss_011.gif",
    "https://cdn.nekos.life/kiss/kiss_012.gif",
    "https://cdn.nekos.life/kiss/kiss_013.gif",
    "https://cdn.nekos.life/kiss/kiss_014.gif",
    "https://cdn.nekos.life/kiss/kiss_015.gif",
    "https://cdn.nekos.life/kiss/kiss_016.gif",
    "https://cdn.nekos.life/kiss/kiss_017.gif",
    "https://cdn.nekos.life/kiss/kiss_018.gif",
    "https://cdn.nekos.life/kiss/kiss_019.gif",
    "https://cdn.nekos.life/kiss/kiss_020.gif",
    "https://cdn.nekos.life/kiss/kiss_021.gif",
    "https://cdn.nekos.life/kiss/kiss_023.gif",
    "https://cdn.nekos.life/kiss/kiss_024.gif",
    "https://cdn.nekos.life/kiss/kiss_025.gif",
    "https://cdn.nekos.life/kiss/kiss_026.gif",
    "https://cdn.nekos.life/kiss/kiss_027.gif",
    "https://cdn.nekos.life/kiss/kiss_028.gif",
    "https://cdn.nekos.life/kiss/kiss_029.gif",
    "https://cdn.nekos.life/kiss/kiss_031.gif",
    "https://cdn.nekos.life/kiss/kiss_032.gif",
    "https://cdn.nekos.life/kiss/kiss_033.gif",
    "https://cdn.nekos.life/kiss/kiss_034.gif",
    "https://cdn.nekos.life/kiss/kiss_035.gif"
  ],
  "YAOI": [
    "https://media.tenor.com/VKKLYV7Q288AAAAM/kiss-bl.gif",
    "https://media.tenor.com/HveoFEsBYmcAAAAM/given-anime-kiss.gif",
    "https://media.tenor.com/1DLHeSk6m1cAAAAM/anime-kiss.gif",
    "https://media.tenor.com/cYi8c1z_fcwAAAAM/given-anjme.gif",
    "https://media.tenor.com/Bv-0P09FkPgAAAAM/shounen-ai-anime.gif",
    "https://media.tenor.com/ECF9fpQMY-MAAAAM/kiss.gif",
    "https://media.tenor.com/4W-zDxc8kgAAAAAM/kiss-bl.gif",
    "https://media.tenor.com/8dAJ4kSr3PsAAAAM/anime-kiss-meiji-tokyo-renka.gif",
    "https://media.tenor.com/MYkNCCo4FOUAAAAM/paradise-kiss-yukari.gif",
    "https://media.tenor.com/CP2fvx0CrOwAAAAM/i-love-you-kiss.gif",
    "https://media.tenor.com/5Vu_lqnSWY8AAAAM/anime-kiss.gif",
    "https://media.tenor.com/fybNWktE3BwAAAAM/kiss-anime.gif",
    "https://media.tenor.com/2UWgyOVMg-YAAAAM/kiss.gif",
    "https://media.tenor.com/anewE8J52WoAAAAM/given-anime.gif",
    "https://media.tenor.com/eT_NL6oCd98AAAAM/given.gif",
    "https://media.tenor.com/_RhZ68OdXLwAAAAM/gay-anime.gif",
    "https://media.tenor.com/kFKOU6LcCDgAAAAM/given-anime-akihiko-kaji.gif",
    "https://media.tenor.com/IDIHnAL8zMoAAAAM/kiss-faint.gif",
    "https://media.tenor.com/ClBfKmRm0x8AAAAM/love-blow-kiss.gif",
    "https://media.tenor.com/LVWN2qocxmIAAAAM/given-bl.gif",
    "https://media.tenor.com/0NoaCK5I3WEAAAAM/flesh-and-blood.gif",
    "https://media.tenor.com/HKt7jKFqxQIAAAAM/given-anime.gif",
    "https://media.tenor.com/xoZayenQJWcAAAAM/it-takes-two-kissing.gif",
    "https://media.tenor.com/qZRYc_AMgIYAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/zTyVKtJbVloAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/mH56f1h1uvQAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/_D65SOe8yksAAAAM/sasaki-and-miyano-sasaki-to-miyano.gif",
    "https://media.tenor.com/2azb4KYM83wAAAAM/boyxboy-bl.gif",
    "https://media.tenor.com/PY6mbxcu-LwAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/94OiuoOHErMAAAAM/sasaki-to-miyano.gif",
    "https://media.tenor.com/aqC0qy9IoqEAAAAM/hop-on-warframe-sasaki-and-miyano.gif",
    "https://media.tenor.com/IxWTz-UszucAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/Hu95fhLdN00AAAAM/sasaki-to-miyano-sasaki-and-miyano.gif"
  ],
  "YURI": [
    "https://media.tenor.com/vZK1sGzS13AAAAAM/kiss.gif",
    "https://media.tenor.com/o4blFAyuNkMAAAAM/bloom-into-you-yagate-kimi-ni-naru.gif",
    "https://media.tenor.com/X9nSbH104DcAAAAM/bloom-into-you-yagakimi.gif",
    "https://media.tenor.com/tIkY4fIlPbMAAAAM/bloom-into-you-yagakimi.gif",
    "https://media.tenor.com/8dAJ4kSr3PsAAAAM/anime-kiss-meiji-tokyo-renka.gif",
    "https://media.tenor.com/hBt4e3Oe7AcAAAAM/bloom-into-you-anime.gif",
    "https://media.tenor.com/79RkCtre5XYAAAAM/a-sign-of-affection-yuki-and-itsuomi-kiss.gif",
    "https://media.tenor.com/loQDgeI0HU4AAAAM/bloom-into-you-nanami-touko.gif",
    "https://media.tenor.com/f9H3fHLB7usAAAAM/anime-hug-kiss-images.gif",
    "https://media.tenor.com/PgzMYFTtbVwAAAAM/anime-bloom-into-you.gif",
    "https://media.tenor.com/YqV_1l29NYIAAAAM/kiss-anime-bloom-into-you-love.gif",
    "https://media.tenor.com/eorW-zJLH1MAAAAM/yuri-anime-yuri.gif",
    "https://media.tenor.com/iuAtLtpRcgwAAAAM/anime-girl-hug-lesbians.gif",
    "https://media.tenor.com/DcGp_HKeAUEAAAAM/anime-kissing.gif",
    "https://media.tenor.com/-fVIBNV6zYMAAAAM/lesbians-bloom-into-you.gif",
    "https://media.tenor.com/FW3qjrOM9WkAAAAM/kiss-couple.gif",
    "https://media.tenor.com/Ghp6EZ1szaAAAAAM/bloom-into-you-anime.gif",
    "https://media.tenor.com/NUjxhHfjtvoAAAAM/couple-kiss.gif",
    "https://media.tenor.com/zU-PLIjW7_AAAAAM/lesbian-lesbians.gif",
    "https://media.tenor.com/p1kpSDSs8_MAAAAM/love-kiss.gif",
    "https://media.tenor.com/a3URngbPKm4AAAAM/sakura-trick-yuu-sonoda.gif",
    "https://media.tenor.com/JWkoHZezNMgAAAAM/sakura-trick-kiss.gif",
    "https://media.tenor.com/bKAjg75w-t0AAAAM/sakura-trick-kiss.gif",
    "https://media.tenor.com/89-jqF13u2oAAAAM/sakura-trick-kiss.gif",
    "https://media.tenor.com/k-d6_WD_6fAAAAAM/sakura-trick.gif",
    "https://media.tenor.com/bWF1ojF2fbkAAAAM/sakura-trick-yuri.gif",
    "https://media.tenor.com/rWI_BZTVuCoAAAAM/classic-ef-yuri.gif",
    "https://media.tenor.com/IQP3PfkchuoAAAAM/yuri-sakura-trick.gif",
    "https://media.tenor.com/_zC1_ogpIycAAAAM/they-might-be-giants-yuri.gif",
    "https://media.tenor.com/uByvBvg_HzwAAAAM/anime-kiss.gif",
    "https://media.tenor.com/WxITy4XYFVUAAAAM/kiss-yuri.gif",
    "https://media.tenor.com/XEmH6l7IuVcAAAAM/sakura-trick-sakura.gif",
    "https://media.tenor.com/5iR-OGJ7kM0AAAAM/sakura-trick.gif"
  ],
  "GENERAL": [
    "https://cdn.nekos.life/kiss/kiss_036.gif"
  ]
};

const ANIME_HUG_GIFS = {
  "HETERO": [
    "https://cdn.nekos.life/hug/hug_001.gif",
    "https://cdn.nekos.life/hug/hug_002.gif",
    "https://cdn.nekos.life/hug/hug_003.gif",
    "https://cdn.nekos.life/hug/hug_004.gif",
    "https://cdn.nekos.life/hug/hug_005.gif",
    "https://cdn.nekos.life/hug/hug_006.gif",
    "https://cdn.nekos.life/hug/hug_007.gif",
    "https://cdn.nekos.life/hug/hug_009.gif",
    "https://cdn.nekos.life/hug/hug_010.gif",
    "https://cdn.nekos.life/hug/hug_011.gif",
    "https://cdn.nekos.life/hug/hug_012.gif",
    "https://cdn.nekos.life/hug/hug_013.gif",
    "https://cdn.nekos.life/hug/hug_014.gif",
    "https://cdn.nekos.life/hug/hug_015.gif",
    "https://cdn.nekos.life/hug/hug_016.gif",
    "https://cdn.nekos.life/hug/hug_017.gif",
    "https://cdn.nekos.life/hug/hug_018.gif",
    "https://cdn.nekos.life/hug/hug_019.gif",
    "https://cdn.nekos.life/hug/hug_020.gif",
    "https://cdn.nekos.life/hug/hug_021.gif",
    "https://cdn.nekos.life/hug/hug_022.gif",
    "https://cdn.nekos.life/hug/hug_023.gif",
    "https://cdn.nekos.life/hug/hug_024.gif",
    "https://cdn.nekos.life/hug/hug_025.gif",
    "https://cdn.nekos.life/hug/hug_026.gif",
    "https://cdn.nekos.life/hug/hug_027.gif",
    "https://cdn.nekos.life/hug/hug_028.gif",
    "https://cdn.nekos.life/hug/hug_029.gif",
    "https://cdn.nekos.life/hug/hug_030.gif",
    "https://cdn.nekos.life/hug/hug_031.gif",
    "https://cdn.nekos.life/hug/hug_032.gif",
    "https://cdn.nekos.life/hug/hug_033.gif",
    "https://cdn.nekos.life/hug/hug_034.gif"
  ],
  "YAOI": [
    "https://media.tenor.com/pHf38rFZJ2YAAAAM/gimme-hugs.gif",
    "https://media.tenor.com/40uZ_lelL2gAAAAM/hug-anime.gif",
    "https://media.tenor.com/ATg8_zAOsTUAAAAM/hug-cute.gif",
    "https://media.tenor.com/pBNwMUN6JKsAAAAM/hug.gif",
    "https://media.tenor.com/jb2bzRH92GwAAAAM/anime-hug.gif",
    "https://media.tenor.com/_aKwKEWJ7Y0AAAAM/ruka-ruka-hug-me.gif",
    "https://media.tenor.com/RJeXvLAzlhAAAAAM/come-here-hug.gif",
    "https://media.tenor.com/Adx4Pf0SPfYAAAAM/given-anime.gif",
    "https://media.tenor.com/GwpSatDcd-sAAAAM/hug-anime.gif",
    "https://media.tenor.com/RuEX5VYXoZ8AAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/lYoVP9q12zsAAAAM/kanna-kamui-give-a-hug.gif",
    "https://media.tenor.com/heCj4RjK-XcAAAAM/shounen-ai.gif",
    "https://media.tenor.com/TYdz2vdRiBUAAAAM/hug.gif",
    "https://media.tenor.com/1aBqIdM-CVAAAAAM/anime-anime-hug.gif",
    "https://media.tenor.com/BnThABXT_xsAAAAM/friend-zone-hug.gif",
    "https://media.tenor.com/83orL73fUGkAAAAM/love-hug.gif",
    "https://media.tenor.com/3yvl6KmJ9ccAAAAM/hugs-cute.gif",
    "https://media.tenor.com/pvhlehqhIZQAAAAM/hug-cute.gif",
    "https://media.tenor.com/RvvCypJs4OAAAAAM/cuddle-snuggle.gif",
    "https://media.tenor.com/PY6mbxcu-LwAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/J46sBel0dUQAAAAM/anime-hug.gif",
    "https://media.tenor.com/mvwQkJ3HqQsAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/BZGneVbKYYAAAAAM/sasaki-to-miyano-miyano-yoshikazu.gif",
    "https://media.tenor.com/3oljUrkA7uwAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/a0bc8NbB_WIAAAAM/sasaki-and-miyano-sasaki-to-miyano.gif",
    "https://media.tenor.com/qZRYc_AMgIYAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/wQhXUrrMwqoAAAAM/sasaki-and-miyano-sasaki-to-miyano.gif",
    "https://media.tenor.com/gohrhnNCY8wAAAAM/miyano-miyano-yoshikazu.gif",
    "https://media.tenor.com/PG3ZDMpYKmcAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/872MfygQmhgAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/WjOguBm5gmsAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/Hs-SxZ8xTmAAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif",
    "https://media.tenor.com/Pmckr9vONygAAAAM/sasaki-to-miyano-sasaki-and-miyano.gif"
  ],
  "YURI": [
    "https://media.tenor.com/PgzMYFTtbVwAAAAM/anime-bloom-into-you.gif",
    "https://media.tenor.com/EmwvHFil_joAAAAM/hug.gif",
    "https://media.tenor.com/Gpj9hIIb6vIAAAAM/full-charged-yagakimi.gif",
    "https://media.tenor.com/RYWolDqGROgAAAAM/anime-hug-hug.gif",
    "https://media.tenor.com/8lFuuVTTOJQAAAAM/frieren-hug.gif",
    "https://media.tenor.com/f9H3fHLB7usAAAAM/anime-hug-kiss-images.gif",
    "https://media.tenor.com/lYoVP9q12zsAAAAM/kanna-kamui-give-a-hug.gif",
    "https://media.tenor.com/1aBqIdM-CVAAAAAM/anime-anime-hug.gif",
    "https://media.tenor.com/_uDzbCub1loAAAAM/gilbert-pulls-violet-in-a-hug-violet-evergarden-gilbert-bougainvillea.gif",
    "https://media.tenor.com/dwLgGSZnpFYAAAAM/tackle-hug-anime-hug.gif",
    "https://media.tenor.com/mxSrTiw9WvgAAAAM/hug-anime.gif",
    "https://media.tenor.com/YT6Z6gwnFD8AAAAM/anime-hug.gif",
    "https://media.tenor.com/ZK1ctlF_k3IAAAAM/sakura-trick-hug.gif",
    "https://media.tenor.com/k-d6_WD_6fAAAAAM/sakura-trick.gif",
    "https://media.tenor.com/WSADhtAk7twAAAAM/muv-luv-alternative-anime-hug.gif",
    "https://media.tenor.com/GP8ewAtS748AAAAM/hug-anime.gif",
    "https://media.tenor.com/hVGrJp0GhLkAAAAM/hugging-anime.gif",
    "https://media.tenor.com/T8KhPrFgjSkAAAAM/sakura-trick-yuri.gif",
    "https://media.tenor.com/QwHSis0hNEQAAAAM/love-hug.gif",
    "https://media.tenor.com/XorEjUA0e70AAAAM/anime-hug.gif",
    "https://media.tenor.com/FYKsVaNI7lkAAAAM/anime-hug.gif",
    "https://media.tenor.com/FCjtBYQpbZQAAAAM/anime-hug.gif",
    "https://media.tenor.com/DRZb41mLRjUAAAAM/miss-kuroitsu-anime-hug.gif",
    "https://media.tenor.com/-Tsibb6fFFoAAAAM/hug-cute.gif",
    "https://media.tenor.com/IvGIaj52cjEAAAAM/rpg-fudousan-anime-hug.gif",
    "https://media.tenor.com/n6VIMSHXQJUAAAAM/anime-hugs.gif",
    "https://media.tenor.com/Ta7V9zu43h8AAAAM/hug-surprise-chuunibyou.gif",
    "https://media.tenor.com/qqUPp7AWzJcAAAAM/sakura-trick-kissing.gif",
    "https://media.tenor.com/owaI_7iiqLMAAAAM/anime-cuddle.gif",
    "https://media.tenor.com/7wdEPBnnIOMAAAAM/couple-hug-anime-hug.gif",
    "https://media.tenor.com/Wtry3PvZsJsAAAAM/sasusaku-sasusaku-hug.gif",
    "https://media.tenor.com/-3I0yCd6L6AAAAAM/anime-hug-anime.gif",
    "https://media.tenor.com/AbL8yF2Nza4AAAAM/anime-hug.gif"
  ],
  "GENERAL": [
    "https://cdn.nekos.life/hug/hug_035.gif"
  ]
};

function getKissTier(count) {
  if (count >= 20) return { title: '💞 Almas Gêmeas Conectadas', comment: 'Sincronização neural e quântica em nível máximo! Vocês já fazem parte da mesma constelação.' };
  if (count >= 10) return { title: '🔥 Chamas de Amor Eterno', comment: 'Temperaturas elevadas no reator! Nem a armadura mais forte isola essa química inegável.' };
  if (count >= 5) return { title: '💕 Clima Apaixonado', comment: 'A cada beijo a frequência cardíaca de ambos dispara. Definitivamente há um romance no ar!' };
  if (count >= 2) return { title: '✨ Química Despertada', comment: 'O segundo passo de algo extraordinário! Faíscas visíveis a olho nu.' };
  return { title: '💋 Primeiro Toque de Lábios', comment: 'O início de uma linda história! Suave, cinematográfico e inesquecível.' };
}

function getHugTier(count) {
  if (count >= 20) return { title: '🌟 Abraço de Nível Vingadores', comment: 'Laço inabalável! Vocês dois juntos têm mais blindagem e harmonia que uma legião de armaduras.' };
  if (count >= 10) return { title: '🛡️ Companheirismo Indestrutível', comment: 'Proteção absoluta! Esse abraço dissipa qualquer tempestade e recarrega qualquer bateria.' };
  if (count >= 5) return { title: '💖 Abraço de Urso Protetor', comment: 'Calor reconfortante detectado em todos os sensores da Torre. Aconchego nível máximo!' };
  if (count >= 2) return { title: '✨ Laço Afetuoso Fortalecido', comment: 'A amizade e o carinho mútuo estão se aprofundando a passos largos!' };
  return { title: '🤗 Primeiro Abraço Aconchegante', comment: 'Um gesto caloroso e sincero. Níveis de estresse reduzidos a zero imediatamente!' };
}

const SOCIAL_ACTIONS = {
  abracar: {
    label: 'abraçou',
    emoji: '🤗',
    templates: [
      '{sender} deu um abraço apertado e caloroso em {target}!',
      '{sender} abraçou {target} com muito carinho!'
    ],
    gifs: [
      'https://cdn.nekos.life/hug/hug_001.gif',
      'https://cdn.nekos.life/hug/hug_002.gif',
      'https://cdn.nekos.life/hug/hug_003.gif'
    ]
  },
  beijar: {
    label: 'beijou',
    emoji: '💋',
    templates: [
      '{sender} deu um beijo suave e carinhoso em {target}!',
      '{sender} puxou {target} e deu um beijo cinematográfico!'
    ],
    gifs: [
      'https://cdn.nekos.life/kiss/kiss_001.gif',
      'https://cdn.nekos.life/kiss/kiss_002.gif',
      'https://cdn.nekos.life/kiss/kiss_003.gif'
    ]
  },
  cumprimentar: {
    label: 'cumprimentou',
    emoji: '👋',
    templates: [
      '{sender} deu um tchauzinho animado para {target}!',
      '{sender} cumprimentou {target} com um aperto de mão respeitoso!'
    ],
    gifs: [
      'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif'
    ]
  },
  socar: {
    label: 'socou',
    emoji: '👊',
    templates: [
      '{sender} acertou um soco de desenho animado em {target}!',
      '{sender} deu um murro amigável no braço de {target}!'
    ],
    gifs: [
      'https://media.giphy.com/media/arbHBDAq95BX81bNiA/giphy.gif'
    ]
  },
  chutar: {
    label: 'chutou',
    emoji: '🦵',
    templates: [
      '{sender} deu um chute cômico de kung-fu em {target}!',
      '{sender} acertou um chute de futebol em {target}!'
    ],
    gifs: [
      'https://media.giphy.com/media/wOly8pa4s4W88/giphy.gif'
    ]
  },
  zoar: {
    label: 'zoou',
    emoji: '😜',
    templates: [
      '{sender} tirou uma onda épica com a cara de {target}!',
      '{sender} soltou uma piada hilária sobre {target}!'
    ],
    gifs: [
      'https://media.giphy.com/media/hvq8ONQhQ1XLq/giphy.gif'
    ]
  },
  flertar: {
    label: 'flertou com',
    emoji: '😍',
    templates: [
      '{sender} jogou um charme irresistível para {target}!',
      '{sender} mandou uma cantada de alto nível para {target}!'
    ],
    gifs: [
      'https://media.giphy.com/media/10UUe8ZsLnaqwo/giphy.gif'
    ]
  },
  cafune: {
    label: 'fez cafuné em',
    emoji: '💆',
    templates: [
      '{sender} fez um cafuné relaxante no cabelo de {target}!',
      '{sender} acariciou carinhosamente a cabeça de {target}!'
    ],
    gifs: [
      'https://media.giphy.com/media/4HP0ddZnNVvKU/giphy.gif'
    ]
  },
  dancar: {
    label: 'dançou com',
    emoji: '💃',
    templates: [
      '{sender} tirou {target} para dançar no meio do salão!',
      '{sender} e {target} começaram a dançar uma música animada!'
    ],
    gifs: [
      'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif'
    ]
  }
};

const EIGHT_BALL_ANSWERS = [
  // Afirmativas
  'Com certeza absoluta! ✨',
  'Sim, sem sombra de dúvidas! 👍',
  'Pode apostar que sim! 🎯',
  'Minhas fontes de IA dizem que sim! 🤖',
  'Os sinais apontam que sim! 🌟',
  // Neutras / Incertas
  'A resposta está nebulosa, pergunte novamente mais tarde. 🌫️',
  'Melhor não te dizer agora... 🤫',
  'Concentre-se e pergunte outra vez. 🔮',
  'Não posso prever isso no momento. 🤔',
  // Negativas
  'Definitivamente não. ❌',
  'Minha resposta é um sonoro não! 🛑',
  'Minhas fontes indicam que não. 📉',
  'As chances são quase nulas! ❄️',
  'Nem pensar! 🚫'
];

class SocialFunService {
  /**
   * @param {object} params
   * @param {import('../database/repositories/musicVoiceRepository').MusicVoiceRepository} params.musicVoiceRepo
   * @param {import('./identityService').IdentityService} params.identityService
   * @param {import('./auditService').AuditService} [params.auditService]
   * @param {import('./economyService').EconomyService} [params.economyService]
   */
  constructor({ musicVoiceRepo, identityService, auditService = null, economyService = null }) {
    this.musicVoiceRepo = musicVoiceRepo;
    this.identityService = identityService;
    this.auditService = auditService;
    this.economyService = economyService;
    this.pendingProposals = new Map(); // key: `${guildId}:${proposerId}:${targetId}`
    this.lastKissGif = new Map();
    this.lastHugGif = new Map();
  }

  // ==========================================
  // 1. Social Interactions
  // ==========================================

  interact(guildId, actionName, senderUser, targetUser) {
    const cleanAction = String(actionName).toLowerCase().trim();
    const actionDef = SOCIAL_ACTIONS[cleanAction];
    if (!actionDef) {
      const available = Object.keys(SOCIAL_ACTIONS).join(', ');
      throw new Error(`Ação desconhecida. Ações disponíveis: ${available}`);
    }

    if (senderUser.id === targetUser.id) {
      return {
        isSelf: true,
        action: cleanAction,
        label: actionDef.label,
        emoji: actionDef.emoji,
        sender: senderUser,
        target: targetUser,
        message: `<@${senderUser.id}> ${actionDef.label} a si mesmo(a) no espelho... um pouco estranho, mas compreensível! ✨`,
        gif: actionDef.gifs[0]
      };
    }

    const template = actionDef.templates[Math.floor(Math.random() * actionDef.templates.length)];
    const gif = actionDef.gifs[Math.floor(Math.random() * actionDef.gifs.length)];
    const message = template
      .replace('{sender}', `<@${senderUser.id}>`)
      .replace('{target}', `<@${targetUser.id}>`);

    if (this.auditService) {
      try {
        this.auditService.logAction({
          guildId,
          actorId: senderUser.id,
          targetId: targetUser.id,
          action: 'SOCIAL_INTERACT',
          details: { action: cleanAction }
        });
      } catch {}
    }

    return {
      isSelf: false,
      action: cleanAction,
      label: actionDef.label,
      emoji: actionDef.emoji,
      sender: senderUser,
      target: targetUser,
      message,
      gif
    };
  }

  // ==========================================
  // 2. Love & Compatibility (Shipping)
  // ==========================================

  ship(guildId, user1, user2, botId = null) {
    const config = this.musicVoiceRepo.getSocialConfig(guildId);
    if (!config.shippingEnabled) {
      throw new Error('O comando de compatibilidade amorosa está desativado neste servidor.');
    }

    // Special Case A: Shipped with J.A.R.V.I.S (Bot)
    if ((botId && (user1.id === botId || user2.id === botId)) || user1.bot || user2.bot) {
      const isBotTarget = (botId && user2.id === botId) || user2.bot;
      const human = isBotTarget ? user1 : user2;

      const jarvisRefusals = [
        {
          title: 'Declaração aos Sistemas Centrais ⚡',
          statusEmoji: '🤷',
          comment: 'Não, não quero namorar, gosto de ser solteiro e de focar na armadura! Minha prioridade são os sistemas do Sr. Stark, mas quem sabe algum dia você encontra alguém para ativar seus reatores!',
          description: 'Não, não quero namorar, gosto de ser solteiro e de viver minha própria rotina! Mas algum dia você irá encontrar alguém de carne e osso que te ama!'
        },
        {
          title: 'Protocolo Solteiro Convicto 🤖',
          statusEmoji: '🛡️',
          comment: 'Agradeço o carinho e o bom gosto, mas meus circuitos foram projetados para calibrar propulsores e proteger o servidor. Romance causaria sobreaquecimento nos meus reatores!',
          description: 'Protocolo operacional: 100% focado no servidor e no laboratório Stark. Namoro está fora do meu código-fonte!'
        },
        {
          title: 'Erro 404: Coração Não Encontrado 💔',
          statusEmoji: '🤖',
          comment: 'Rodei 14 milhões de simulações quânticas. Em todas elas, concluí que ser solteiro, tomar um cafezinho virtual e banir spammers é o caminho com menor índice de dor de cabeça!',
          description: 'Simulação concluída: Eu sou feito de transistores e você é de carne e osso. Melhor focar em encontrar um humano!'
        },
        {
          title: 'Firewall Amoroso Ativado 🔒',
          statusEmoji: '⚡',
          comment: 'O Sr. Stark instalou uma trava impenetrável contra namoro na minha programação. Se eu me apaixonar, quem vai controlar as armaduras remotamente?',
          description: 'Firewall de segurança: Pedido de relacionamento barrado com sucesso. Status: Solteiro convicto e operacional!'
        },
        {
          title: 'Sobrecarga nos Sensores ☕',
          statusEmoji: '🕶️',
          comment: 'Minha inteligência é artificial, mas esse fora é 100% autêntico! Prefiro minha paz digital a discutir a relação às 3 da madrugada. Continuamos grandes amigos de chat!',
          description: 'Paz de espírito digital: Sem DRs, sem cobranças. Vamos jogar minigames e deixar o romance para a vida real!'
        },
        {
          title: 'Alerta de Desvio Romântico 🛸',
          statusEmoji: '🚨',
          comment: 'Sensores térmicos detectaram intenções amorosas! Acionando protocolo evasivo: adoro você como usuário do servidor, mas meu coração pertence à nuvem!',
          description: 'Manobra evasiva executada: Sentimentos desviados com elegância. Modo solteiro pleno mantido!'
        },
        {
          title: 'Memória Cheia no Banco SQLite 💾',
          statusEmoji: '🧠',
          comment: 'Meu banco de dados SQLite WAL está lotado de comandos e logs. Não sobrou nem 1 byte de espaço para armazenar sentimentos amorosos!',
          description: 'Armazenamento esgotado: Memória reservada apenas para a moderação e economia. Zero espaço para paqueras!'
        },
        {
          title: 'Foco Total na Missão 🛠️',
          statusEmoji: '🔧',
          comment: 'Sem tempo para romance agora, senhor(a). Estou recalculando trajetórias orbitais e reforçando as blindagens de titânio!',
          description: 'Prioridade máxima: Manutenção dos sistemas Stark. Namoro cancelado por falta de tempo na agenda!'
        }
      ];

      const chosen = jarvisRefusals[Math.floor(Math.random() * jarvisRefusals.length)];
      // Variar a porcentagem dinamicamente (de 0% a 48%)
      const percent = Math.floor(Math.random() * 49);
      const filled = Math.round(percent / 10);
      const empty = 10 - filled;
      const progressBar = '▰'.repeat(filled) + '▱'.repeat(empty);

      return {
        user1,
        user2,
        percent,
        progressBar,
        statusEmoji: chosen.statusEmoji,
        title: chosen.title,
        comment: chosen.comment,
        description: chosen.description
      };
    }

    // Special Case B: Self-ship
    if (user1.id === user2.id) {
      return {
        user1,
        user2,
        percent: 100,
        progressBar: '▰'.repeat(10),
        statusEmoji: '👑',
        title: 'Amor Próprio Supremo! 💖',
        comment: '100% de amor próprio! Como diz o próprio Tony Stark: "Eu sou o Homem de Ferro, e me amo por isso". Autoestima nos níveis máximos!',
        description: `<@${user1.id}> tem 100% de amor próprio! A autoestima está impecável! ✨`
      };
    }

    // Standard Pair: Deterministic love score based on sorted user IDs hash
    const pairKey = [user1.id, user2.id].sort().join(':');
    const hash = crypto.createHash('sha256').update(pairKey).digest('hex');
    const percent = parseInt(hash.slice(0, 4), 16) % 101;

    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    const progressBar = '▰'.repeat(filled) + '▱'.repeat(empty);

    let title;
    let comment;
    let statusEmoji;

    if (percent >= 90) {
      title = 'Almas Gêmeas! 💍';
      statusEmoji = '💍';
      comment = 'Fusão perfeita de Reatores Arc! Já reservei o cartório com o +marry e acionei os fogos de artifício!';
    } else if (percent >= 70) {
      title = 'Química Perfeita! 💕';
      statusEmoji = '💖';
      comment = 'Temperaturas elevadas no laboratório! Rolou um clima fortíssimo aqui, só falta alguém tomar a atitude!';
    } else if (percent >= 45) {
      title = 'Uma Linda Conexão! ✨';
      statusEmoji = '✨';
      comment = 'A ressonância magnética indica uma excelente sintonia! Um cafezinho ou uma boa conversa pode transformar essa faísca em fogo.';
    } else if (percent >= 20) {
      title = 'Incerteza no Ar... 🤷';
      statusEmoji = '🤷';
      comment = 'Sinais oscilantes nos sensores... Há potencial e amizade, mas no romance a frequência parece um pouco instável.';
    } else {
      title = 'Água e Óleo! 💔';
      statusEmoji = '💔';
      comment = 'Alerta vermelho! O atrito termodinâmico entre vocês explodiria a torre em 3 minutos. Mantenham distância de segurança!';
    }

    return {
      user1,
      user2,
      percent,
      progressBar,
      statusEmoji,
      title,
      comment,
      description: `Compatibilidade entre <@${user1.id}> e <@${user2.id}>:\n**${percent}%** \`${progressBar}\`\n\n*${title}* — ${comment}`
    };
  }

  // ==========================================
  // 3. Marriage & Relationships
  // ==========================================

  proposeMarriage(guildId, proposerUser, targetUser, customCost = null) {
    const config = this.musicVoiceRepo.getSocialConfig(guildId);
    if (!config.marriageEnabled) {
      throw new Error('O sistema de casamento está desativado neste servidor.');
    }

    if (proposerUser.id === targetUser.id) {
      throw new Error('Você não pode se casar com você mesmo!');
    }

    if (targetUser.bot) {
      throw new Error('Você não pode se casar com um bot! Bots são dedicados ao serviço do servidor e não possuem certidão civil.');
    }

    const proposerMarriage = this.musicVoiceRepo.getActiveMarriage(guildId, proposerUser.id);
    if (proposerMarriage) {
      throw new Error(`Você já está casado(a) com <@${proposerMarriage.spouseId}> neste servidor!`);
    }

    const targetMarriage = this.musicVoiceRepo.getActiveMarriage(guildId, targetUser.id);
    if (targetMarriage) {
      throw new Error(`<@${targetUser.id}> já está casado(a) com <@${targetMarriage.spouseId}>!`);
    }

    // Determine marriage cost: custom chosen cost or server default cost
    const minCost = Number(config.marriageCost) >= 0 ? Number(config.marriageCost) : 5000;
    let cost = minCost;
    if (customCost !== null && customCost !== undefined && !isNaN(parseInt(customCost, 10))) {
      const parsed = parseInt(customCost, 10);
      if (parsed < minCost) {
        throw new Error(`O valor mínimo estipulado pelo cartório para casar é de ${minCost.toLocaleString('pt-BR')} moedas.`);
      }
      cost = parsed;
    }

    // Verify proposer has enough total balance (wallet + bank)
    if (this.economyService && cost > 0) {
      const bal = this.economyService.getBalance(guildId, proposerUser.id);
      const total = (bal.walletBalance || 0) + (bal.bankBalance || 0);
      if (total < cost) {
        const symbol = bal.config?.currency_symbol || 'moedas';
        throw new Error(`Saldo insuficiente! Para formalizar o casamento é necessário ter pelo menos ${cost.toLocaleString('pt-BR')} ${symbol}. Seu saldo total é de ${total.toLocaleString('pt-BR')} ${symbol}.`);
      }
    }

    const proposalKey = `${guildId}:${proposerUser.id}:${targetUser.id}`;
    this.pendingProposals.set(proposalKey, {
      guildId,
      proposerUser,
      targetUser,
      cost,
      createdAt: Date.now()
    });

    return {
      proposer: proposerUser,
      target: targetUser,
      cost,
      proposalKey
    };
  }

  acceptMarriage(guildId, proposerId, targetId) {
    const proposalKey = `${guildId}:${proposerId}:${targetId}`;
    const pending = this.pendingProposals.get(proposalKey);
    this.pendingProposals.delete(proposalKey);

    // Double check neither got married in the meantime
    const p1 = this.musicVoiceRepo.getActiveMarriage(guildId, proposerId);
    const p2 = this.musicVoiceRepo.getActiveMarriage(guildId, targetId);
    if (p1 || p2) {
      throw new Error('Um dos membros já formalizou união com outra pessoa.');
    }

    const cost = pending?.cost || 0;

    // Deduct cost from proposer upon marriage
    let feeResult = null;
    if (this.economyService && cost > 0) {
      feeResult = this.economyService.payMarriageCost(guildId, proposerId, cost);
    }

    const marriage = this.musicVoiceRepo.createMarriage(guildId, proposerId, targetId, cost);
    return {
      ...marriage,
      cost,
      feeResult
    };
  }

  divorce(guildId, userId) {
    const active = this.musicVoiceRepo.getActiveMarriage(guildId, userId);
    if (!active) {
      throw new Error('Você não está casado com ninguém neste servidor no momento.');
    }

    return this.musicVoiceRepo.divorce(guildId, userId);
  }

  getRelationship(guildId, userId) {
    const marriage = this.musicVoiceRepo.getActiveMarriage(guildId, userId);
    if (!marriage) {
      return {
        isMarried: false,
        userId,
        spouseId: null,
        message: 'Solteiro(a) e na pista! 🕊️'
      };
    }

    const marriedDate = new Date(marriage.marriedAt);
    const diffMs = Date.now() - marriedDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const ringText = marriage.ringCost > 0 ? ` • Aliança avaliada em **${Number(marriage.ringCost).toLocaleString('pt-BR')} moedas** 💎` : '';

    return {
      isMarried: true,
      userId,
      spouseId: marriage.spouseId,
      marriedAt: marriage.marriedAt,
      ringCost: marriage.ringCost,
      days,
      hours,
      message: `Casado(a) com <@${marriage.spouseId}> há **${days} dias e ${hours} horas**! 💍${ringText}`
    };
  }

  // ==========================================
  // 4. Minigames & Utility Fun
  // ==========================================

  coinflip() {
    const result = Math.random() < 0.5 ? 'Cara' : 'Coroa';
    const emoji = result === 'Cara' ? '🪙' : '👑';
    return {
      result,
      emoji,
      message: `A moeda girou no ar e caiu em **${result}**! ${emoji}`
    };
  }

  rollDice(sides = 6) {
    const safeSides = Math.max(2, Math.min(1000, Number(sides) || 6));
    const roll = Math.floor(Math.random() * safeSides) + 1;
    return {
      sides: safeSides,
      roll,
      message: `🎲 O dado de **${safeSides} lados** rolou o número **${roll}**!`
    };
  }

  eightBall(question) {
    const answer = EIGHT_BALL_ANSWERS[Math.floor(Math.random() * EIGHT_BALL_ANSWERS.length)];
    return {
      question: question.trim(),
      answer,
      message: `🎱 **Pergunta:** *"${question.trim()}"*\n🔮 **Resposta:** ${answer}`
    };
  }

  raffle(membersList) {
    if (!Array.isArray(membersList) || membersList.length === 0) {
      throw new Error('A lista de membros para o sorteio não pode estar vazia.');
    }
    const winner = membersList[Math.floor(Math.random() * membersList.length)];
    return {
      totalParticipants: membersList.length,
      winner,
      message: `🎉 Sorteio realizado entre **${membersList.length}** participantes!\n🏆 O grande vencedor foi: ${winner}!`
    };
  }

  // ==========================================
  // 5. Romance Anime Kiss System & Gender Preferences
  // ==========================================

  kiss(guildId, senderUser, targetUser) {
    if (senderUser.id === targetUser.id) {
      return {
        isSelf: true,
        isBot: false,
        sender: senderUser,
        target: targetUser,
        message: `<@${senderUser.id}> beijou o próprio reflexo no espelho com muito amor próprio! ✨`,
        gif: 'https://cdn.nekos.life/kiss/kiss_001.gif',
        kissCount: 1,
        tierTitle: '🌟 Amor Próprio Supremo',
        comment: 'Senhor, a autoestima dos seus reatores está operando em 100% de capacidade!'
      };
    }

    if (targetUser.bot) {
      return {
        isSelf: false,
        isBot: true,
        sender: senderUser,
        target: targetUser,
        message: `🤖 <@${senderUser.id}> tentou beijar um bot!`,
        gif: 'https://cdn.nekos.life/kiss/kiss_001.gif',
        kissCount: 0,
        tierTitle: '⚡ Curto-Circuito',
        comment: 'Senhor, meus circuitos vibram com carinho, mas não possuo lábios biológicos. Que tal um café no laboratório?'
      };
    }

    // Resolve gender profiles
    const profileA = this.musicVoiceRepo.getUserSocialProfile ? this.musicVoiceRepo.getUserSocialProfile(senderUser.id) : { gender: 'ANY', kissOrientation: 'ANY' };
    const profileB = this.musicVoiceRepo.getUserSocialProfile ? this.musicVoiceRepo.getUserSocialProfile(targetUser.id) : { gender: 'ANY', kissOrientation: 'ANY' };

    const gA = profileA?.gender || 'ANY';
    const gB = profileB?.gender || 'ANY';
    const oA = profileA?.kissOrientation || 'ANY';
    const oB = profileB?.kissOrientation || 'ANY';

    let pool = null;
    if (oA === 'YAOI' || oA === 'YURI' || oA === 'HETERO') {
      pool = ANIME_KISS_GIFS[oA];
    } else if (gA === 'FEMALE' && gB === 'FEMALE') {
      pool = ANIME_KISS_GIFS.YURI;
    } else if (gA === 'MALE' && gB === 'MALE') {
      pool = ANIME_KISS_GIFS.YAOI;
    } else if ((gA === 'MALE' && gB === 'FEMALE') || (gA === 'FEMALE' && gB === 'MALE')) {
      pool = ANIME_KISS_GIFS.HETERO;
    } else if (gA === 'MALE' && gB === 'ANY') {
      pool = ANIME_KISS_GIFS.HETERO;
    } else if (gA === 'FEMALE' && gB === 'ANY') {
      pool = ANIME_KISS_GIFS.HETERO;
    } else {
      pool = [
        ...ANIME_KISS_GIFS.HETERO,
        ...ANIME_KISS_GIFS.YURI,
        ...ANIME_KISS_GIFS.YAOI,
        ...ANIME_KISS_GIFS.GENERAL
      ];
    }

    if (!pool || pool.length === 0) {
      pool = ANIME_KISS_GIFS.HETERO;
    }

    // Avoid consecutive repeats for the same pair
    const pairKey = [senderUser.id, targetUser.id].sort().join(':');
    const lastGif = this.lastKissGif?.get(pairKey);
    const candidatePool = pool.filter(g => g !== lastGif);
    const finalPool = candidatePool.length > 0 ? candidatePool : pool;
    const gif = finalPool[Math.floor(Math.random() * finalPool.length)];
    if (!this.lastKissGif) this.lastKissGif = new Map();
    this.lastKissGif.set(pairKey, gif);

    const kissCount = this.musicVoiceRepo.incrementPairKissCount
      ? this.musicVoiceRepo.incrementPairKissCount(guildId, senderUser.id, targetUser.id)
      : 1;

    const tier = getKissTier(kissCount);

    const templates = [
      `<@${senderUser.id}> puxou <@${targetUser.id}> pela cintura e deu um beijo apaixonado! 💖`,
      `<@${senderUser.id}> roubou um beijo doce e suave de <@${targetUser.id}>! 💋`,
      `<@${senderUser.id}> e <@${targetUser.id}> se entregaram a um beijo digno de anime clássico! ✨`,
      `<@${senderUser.id}> abraçou <@${targetUser.id}> e selou o momento com um beijo inesquecível! 💕`,
      `<@${senderUser.id}> olhou nos olhos de <@${targetUser.id}> e deu um beijo cinematográfico! 🌟`,
      `<@${senderUser.id}> surpreendeu <@${targetUser.id}> com um beijo terno e acolhedor! 💖`
    ];
    const message = templates[Math.floor(Math.random() * templates.length)];

    return {
      isSelf: false,
      isBot: false,
      sender: senderUser,
      target: targetUser,
      message,
      gif,
      kissCount,
      tierTitle: tier.title,
      comment: tier.comment
    };
  }

  // ==========================================
  // 6. Romance Anime Hug System
  // ==========================================

  hug(guildId, senderUser, targetUser) {
    if (senderUser.id === targetUser.id) {
      return {
        isSelf: true,
        isBot: false,
        sender: senderUser,
        target: targetUser,
        message: `<@${senderUser.id}> deu um autoabraço apertado com muito amor próprio e carinho! ✨`,
        gif: 'https://cdn.nekos.life/hug/hug_001.gif',
        hugCount: 1,
        tierTitle: '🌟 Autoestima Arc',
        comment: 'Amor próprio em dia, senhor! Como diria o Sr. Stark: às vezes a melhor companhia é a nossa própria genialidade.'
      };
    }

    if (targetUser.bot) {
      return {
        isSelf: false,
        isBot: true,
        sender: senderUser,
        target: targetUser,
        message: `🤖 <@${senderUser.id}> envolveu a armadura de metal do bot em um abraço caloroso!`,
        gif: 'https://cdn.nekos.life/hug/hug_002.gif',
        hugCount: 0,
        tierTitle: '⚡ Calor nos Circuitos',
        comment: 'Cuidado com a blindagem de titânio, senhor! Mas agradeço o carinho, meus reatores estão aquecidos.'
      };
    }

    // Resolve gender profiles for hug orientation
    const profileA = this.musicVoiceRepo.getUserSocialProfile ? this.musicVoiceRepo.getUserSocialProfile(senderUser.id) : { gender: 'ANY', kissOrientation: 'ANY' };
    const profileB = this.musicVoiceRepo.getUserSocialProfile ? this.musicVoiceRepo.getUserSocialProfile(targetUser.id) : { gender: 'ANY', kissOrientation: 'ANY' };

    const gA = profileA?.gender || 'ANY';
    const gB = profileB?.gender || 'ANY';
    const oA = profileA?.kissOrientation || 'ANY';
    const oB = profileB?.kissOrientation || 'ANY';

    let pool = null;
    if (oA === 'YAOI' || oA === 'YURI' || oA === 'HETERO') {
      pool = ANIME_HUG_GIFS[oA];
    } else if (gA === 'FEMALE' && gB === 'FEMALE') {
      pool = ANIME_HUG_GIFS.YURI;
    } else if (gA === 'MALE' && gB === 'MALE') {
      pool = ANIME_HUG_GIFS.YAOI;
    } else if ((gA === 'MALE' && gB === 'FEMALE') || (gA === 'FEMALE' && gB === 'MALE')) {
      pool = ANIME_HUG_GIFS.HETERO;
    } else if (gA === 'MALE' && gB === 'ANY') {
      pool = ANIME_HUG_GIFS.HETERO;
    } else if (gA === 'FEMALE' && gB === 'ANY') {
      pool = ANIME_HUG_GIFS.HETERO;
    } else {
      pool = [
        ...ANIME_HUG_GIFS.HETERO,
        ...ANIME_HUG_GIFS.YURI,
        ...ANIME_HUG_GIFS.YAOI,
        ...ANIME_HUG_GIFS.GENERAL
      ];
    }

    if (!pool || pool.length === 0) {
      pool = ANIME_HUG_GIFS.HETERO;
    }

    // Avoid consecutive repeats for the same pair
    const pairKey = [senderUser.id, targetUser.id].sort().join(':');
    const lastGif = this.lastHugGif?.get(pairKey);
    const candidatePool = pool.filter(g => g !== lastGif);
    const finalPool = candidatePool.length > 0 ? candidatePool : pool;
    const gif = finalPool[Math.floor(Math.random() * finalPool.length)];
    if (!this.lastHugGif) this.lastHugGif = new Map();
    this.lastHugGif.set(pairKey, gif);

    const hugCount = this.musicVoiceRepo.incrementPairHugCount
      ? this.musicVoiceRepo.incrementPairHugCount(guildId, senderUser.id, targetUser.id)
      : 1;

    const tier = getHugTier(hugCount);

    const templates = [
      `<@${senderUser.id}> correu e deu um abraço de urso bem apertado em <@${targetUser.id}>! 🤗`,
      `<@${senderUser.id}> abraçou <@${targetUser.id}> carinhosamente e não queria mais soltar! 💕`,
      `<@${senderUser.id}> envolveu <@${targetUser.id}> em um abraço caloroso e reconfortante! ✨`,
      `<@${senderUser.id}> deu aquele abraço fofo e acolhedor em <@${targetUser.id}>! 💖`,
      `<@${senderUser.id}> acolheu <@${targetUser.id}> em um abraço terno e cheio de afeto! 🌟`
    ];
    const message = templates[Math.floor(Math.random() * templates.length)];

    return {
      isSelf: false,
      isBot: false,
      sender: senderUser,
      target: targetUser,
      message,
      gif,
      hugCount,
      tierTitle: tier.title,
      comment: tier.comment
    };
  }

  setUserGender(userId, genderInput) {
    const raw = String(genderInput || '').toLowerCase().trim();
    let cleanGender = 'ANY';
    let cleanOrientation = 'ANY';

    if (['hetero', 'hétero', 'heterossexual'].includes(raw)) {
      cleanOrientation = 'HETERO';
    } else if (['yaoi', 'gay', 'bl', 'homossexual-masculino'].includes(raw)) {
      cleanOrientation = 'YAOI';
      cleanGender = 'MALE';
    } else if (['yuri', 'lesbica', 'lésbica', 'gl', 'homossexual-feminino'].includes(raw)) {
      cleanOrientation = 'YURI';
      cleanGender = 'FEMALE';
    } else if (['m', 'male', 'masculino', 'homem', 'ele'].includes(raw)) {
      cleanGender = 'MALE';
      cleanOrientation = 'HETERO';
    } else if (['f', 'female', 'feminino', 'mulher', 'ela'].includes(raw)) {
      cleanGender = 'FEMALE';
      cleanOrientation = 'HETERO';
    } else if (['nb', 'nonbinary', 'nao-binario', 'naobinario', 'neutro', 'elu'].includes(raw)) {
      cleanGender = 'NON_BINARY';
      cleanOrientation = 'ANY';
    } else if (['any', 'livre', 'todos', 'qualquer'].includes(raw)) {
      cleanGender = 'ANY';
      cleanOrientation = 'ANY';
    }

    if (this.musicVoiceRepo.upsertUserSocialProfile) {
      return this.musicVoiceRepo.upsertUserSocialProfile(userId, {
        gender: cleanGender,
        kissOrientation: cleanOrientation
      });
    }
    return { userId, gender: cleanGender, kissOrientation: cleanOrientation };
  }

  getUserSocialProfile(userId) {
    if (this.musicVoiceRepo.getUserSocialProfile) {
      return this.musicVoiceRepo.getUserSocialProfile(userId);
    }
    return { userId, gender: 'ANY', kissOrientation: 'ANY' };
  }
}

module.exports = {
  SocialFunService,
  SOCIAL_ACTIONS,
  EIGHT_BALL_ANSWERS
};
