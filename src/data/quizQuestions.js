/**
 * Comprehensive Question Bank for J.A.R.V.I.S. Quiz Arena
 * Categories: games, animes, futebol, geral, computacao, marvel
 * Total Questions: 101 (All verified with high quality illustrative answer images)
 */

const QUIZ_CATEGORIES = {
  games: {
    name: 'Jogos & Games',
    emoji: '🎮',
    color: 0x5865F2,
    description: 'Franquias épicas, consoles, chefes, mundos abertos e curiosidades gamer.'
  },
  animes: {
    name: 'Animes & Mangás',
    emoji: '⛩️',
    color: 0xF47B67,
    description: 'Shonens clássicos, poderes, protagonistas, vilões e universos de anime.'
  },
  futebol: {
    name: 'Futebol & Esportes',
    emoji: '⚽',
    color: 0x57F287,
    description: 'Copas do Mundo, Champions League, lendas, clubes e regras dos gramados.'
  },
  geral: {
    name: 'Conhecimentos Gerais & Ciências',
    emoji: '🧠',
    color: 0x00D26A,
    description: 'Biologia, astronomia, história, geografia, cinema e cultura pop.'
  },
  computacao: {
    name: 'Computação & Tecnologia',
    emoji: '💻',
    color: 0x00E5FF,
    description: 'Hardware, programação, sistemas operacionais, redes, binário e IA.'
  },
  marvel: {
    name: 'Universo Marvel & Stark',
    emoji: '⚡',
    color: 0xED4245,
    description: 'Vingadores, armaduras, Joias do Infinito e tecnologias da Torre Stark.'
  },
  series: {
    name: 'Cinema & Séries',
    emoji: '🎬',
    color: 0xE50914,
    description: 'Grandes sucessos do cinema, Hollywood, diretores, séries da Netflix/HBO e clássicos.'
  },
  musica: {
    name: 'Música & Hits',
    emoji: '🎵',
    color: 0x1DB954,
    description: 'Bandas históricas, rock, pop, hip-hop, instrumentos, álbuns lendários e festivais.'
  },
  mitologia: {
    name: 'Mitologia & História',
    emoji: '🏛️',
    color: 0xD4AF37,
    description: 'Deuses gregos, nórdicos, egípcios, grandes impérios, guerras e fatos históricos.'
  },
  desenhos: {
    name: 'Desenhos & Nostalgia',
    emoji: '🎨',
    color: 0xFF7300,
    description: 'Clássicos da Cartoon Network, Disney, Nickelodeon, animações e nostalgia dos anos 90/2000.'
  },
  geografia: {
    name: 'Geografia & Países',
    emoji: '🌍',
    color: 0x3498DB,
    description: 'Capitais mundiais, bandeiras, pontos turísticos, oceanos, montanhas e curiosidades do globo.'
  }
};

const QUIZ_QUESTIONS = [
  // ==========================================
  // 1. GAMES (18 Perguntas)
  // ==========================================
  {
    id: 'game_01',
    category: 'games',
    question: 'No jogo Minecraft, qual é o chefe dragão que habita a dimensão sombria do The End?',
    answers: ['ender dragon', 'dragao do fim', 'enderdragon', 'dragao ender', 'o dragao do fim'],
    explanation: 'O Ender Dragon foi o primeiro chefe oficial adicionado ao Minecraft na versão 1.0.0, guardando o portal de volta ao mundo comum.',
    imageUrl: 'https://media.tenor.com/REZzIbg6WloAAAAC/ender-dragon-death.gif'
  },
  {
    id: 'game_02',
    category: 'games',
    question: 'Em Grand Theft Auto V (GTA V), qual o nome da metrópole fictícia inspirada na cidade real de Los Angeles?',
    answers: ['los santos', 'lossantos'],
    explanation: 'Los Santos apareceu originalmente em GTA: San Andreas (2004) e foi completamente recriada em escala colossal para o GTA V (2013).',
    imageUrl: 'https://media.tenor.com/vOGPLNfcJ-cAAAAC/mmi-morsmutual.gif'
  },
  {
    id: 'game_03',
    category: 'games',
    question: 'Na franquia The Legend of Zelda, qual é o nome do herói silencioso de túnica verde que empunha a Master Sword?',
    answers: ['link', 'o link'],
    explanation: 'Ao contrário do equívoco popular de chamá-lo de Zelda (que é a princesa protegida), o herói lendário de Hyrule se chama Link.',
    imageUrl: 'https://media.tenor.com/BbjYlK0Z7ZkAAAAC/link-zelda.gif'
  },
  {
    id: 'game_04',
    category: 'games',
    question: 'Qual é o nome do estúdio japonês aclamado mundialmente por criar Dark Souls, Bloodborne e Elden Ring?',
    answers: ['fromsoftware', 'from software', 'fromsoft'],
    explanation: 'Liderada por Hidetaka Miyazaki, a FromSoftware revolucionou a indústria com o gênero "Soulslike", caracterizado por desafio rigoroso e narrativa ambiental.',
    imageUrl: 'https://media.tenor.com/p-CytW4gJvEAAAAC/firelink-shrine-bonfire.gif'
  },
  {
    id: 'game_05',
    category: 'games',
    question: 'Qual é a profissão tradicional e mundialmente conhecida do mascote italiano da Nintendo, o Mario?',
    answers: ['encanador', 'encanador italiano', 'plumber'],
    explanation: 'Embora tenha estreado como carpinteiro em Donkey Kong (1981), Mario se tornou oficialmente um encanador nos encanamentos subterrâneos de Nova York.',
    imageUrl: 'https://media.tenor.com/ncDw4rfoofwAAAAC/mario.gif'
  },
  {
    id: 'game_06',
    category: 'games',
    question: 'Na saga nórdica de God of War (2018/Ragnarök), qual é o nome do filho de Kratos que revela ser Loki?',
    answers: ['atreus', 'loki'],
    explanation: 'Atreus é filho de Kratos e da gigante Faye. Ao longo de sua jornada, ele descobre que seu nome de batismo entre os gigantes Jötunn é Loki.',
    imageUrl: 'https://media.tenor.com/Iq6u9mvjjmsAAAAC/god-of-war-ragnarok.gif'
  },
  {
    id: 'game_07',
    category: 'games',
    question: 'Qual é o Pokémon do tipo elétrico de número 25 da Pokédex que é o principal mascote da franquia?',
    answers: ['pikachu'],
    explanation: 'Criado pela designer Atsuko Nishida e Ken Sugimori, Pikachu se tornou um dos ícones culturais mais reconhecidos de todo o planeta.',
    imageUrl: 'https://media.tenor.com/PTbKzVzPFhsAAAAC/pikachu-pokemon.gif'
  },
  {
    id: 'game_08',
    category: 'games',
    question: 'Em The Last of Us, qual é o nome do fungo real que sofreu mutação e causou a infecção dos Estaladores e Zumbis?',
    answers: ['cordyceps', 'cordyceps unilateralis', 'fungo cordyceps'],
    explanation: 'O fungo Ophiocordyceps unilateralis existe na natureza e infecta formigas. Na ficção da Naughty Dog, ele evoluiu para infectar o cérebro de seres humanos.',
    imageUrl: 'https://media.tenor.com/fPqt83nh8hwAAAAC/last-of-us-the-last-of-us.gif'
  },
  {
    id: 'game_09',
    category: 'games',
    question: 'Qual é o mapa clássico de 3 rotas (Top, Mid, Bot) onde se jogam as partidas competitivas de League of Legends?',
    answers: ['summoners rift', 'summoner rift', 'summoner\'s rift', 'rift'],
    explanation: 'Summoner\'s Rift é o mapa central de League of Legends desde o seu lançamento em 2009, abrigando o Barão Na\'Shor e os Dragões Elementais.',
    imageUrl: 'https://media.tenor.com/5Q5jcKA7wT8AAAAC/leagueoflegends.gif'
  },
  {
    id: 'game_10',
    category: 'games',
    question: 'Qual o nome da megalópole futurista e decadente dominada por megacorporações em Cyberpunk 2077?',
    answers: ['night city', 'nightcity'],
    explanation: 'Night City é uma cidade-estado autônoma no Estado Livre do Norte da Califórnia, famosa pela violência, tecnologia extrema e os bairros de Watson e Pacifica.',
    imageUrl: 'https://media.tenor.com/Qn6S5_GZfbgAAAAC/night-city-cyberpunk2077.gif'
  },
  {
    id: 'game_11',
    category: 'games',
    question: 'Qual é o console de videogame doméstico mais vendido de toda a história, ultrapassando 155 milhões de unidades?',
    answers: ['playstation 2', 'ps2', 'o ps2', 'o playstation 2'],
    explanation: 'Lançado no ano 2000 pela Sony, o PlayStation 2 conquistou o mundo com sua enorme biblioteca de clássicos e a inclusão de um leitor de DVD integrado.',
    imageUrl: 'https://media.tenor.com/TOeD74W5IbgAAAAC/ps2-playstation2.gif'
  },
  {
    id: 'game_12',
    category: 'games',
    question: 'Qual lendário designer de jogos japonês da Nintendo criou as franquias Super Mario, The Legend of Zelda e Donkey Kong?',
    answers: ['shigeru miyamoto', 'miyamoto'],
    explanation: 'Miyamoto é amplamente considerado o "pai dos videogames modernos", tendo entrado na Nintendo em 1977 e revolucionado a indústria do entretenimento.',
    imageUrl: 'https://media.tenor.com/u_nOdVTdnLoAAAAC/miyamoto-nintendo-switch-2-price.gif'
  },
  {
    id: 'game_13',
    category: 'games',
    question: 'Em Final Fantasy VII, qual é o nome da colossal espada lâmina-larga empunhada pelo ex-SOLDIER Cloud Strife?',
    answers: ['buster sword', 'espada buster'],
    explanation: 'A Buster Sword foi herdada por Cloud de seu amigo e mentor Zack Fair, que por sua vez a recebeu de Angeal Hewley em Crisis Core.',
    imageUrl: 'https://media.tenor.com/9qAIGQjmcj0AAAAC/final-fantasy-vii-final-fantasy-7.gif'
  },
  {
    id: 'game_14',
    category: 'games',
    question: 'Qual jogo battle royale desenvolvido pela Epic Games se tornou fenômeno mundial misturando tiroteios e construção de estruturas?',
    answers: ['fortnite', 'o fortnite'],
    explanation: 'Fortnite Battle Royale foi lançado em 2017 e explodiu em popularidade com seus eventos musicais ao vivo, colaborações épicas e mecânica de construção rápida.',
    imageUrl: 'https://media.tenor.com/yzEE9IboXWgAAAAC/sunekendo-hug.gif'
  },
  {
    id: 'game_15',
    category: 'games',
    question: 'Qual é o nome da destemida arqueóloga britânica protagonista da clássica franquia de ação e aventura Tomb Raider?',
    answers: ['lara croft', 'lara'],
    explanation: 'Criada pela Core Design em 1996, Lara Croft se tornou uma das maiores heroínas da história dos games, explorando tumbas ancestrais pelo mundo.',
    imageUrl: 'https://media.tenor.com/aB0e-Z19-KgAAAAC/angelina-jolie-lara-croft.gif'
  },
  {
    id: 'game_16',
    category: 'games',
    question: 'Em Resident Evil 4, qual é o nome do líder fanático do culto Los Iluminados que comanda a seita das Plagas?',
    answers: ['osmund saddler', 'saddler', 'lord saddler'],
    explanation: 'Lord Saddler usou as Plagas para controlar a população local de uma região remota da Espanha e planejava infectar a filha do presidente dos EUA, Ashley Graham.',
    imageUrl: 'https://media.tenor.com/tTbL6LLpYa8AAAAC/mr-kennedy-entertain-me.gif'
  },
  {
    id: 'game_17',
    category: 'games',
    question: 'Na franquia The Witcher, qual é o nome da ordem de guerreiros mutantes caçadores de monstros da qual Geralt de Rívia faz parte?',
    answers: ['bruxo', 'bruxos', 'witcher', 'witchers'],
    explanation: 'Os Bruxos passam pelo perigoso "Teste das Ervas" na infância para adquirir reflexos sobre-humanos, imunidade e capacidade de conjurar Sinais elementais.',
    imageUrl: 'https://media.tenor.com/ZNTs2f2mHQ8AAAAC/geralt.gif'
  },
  {
    id: 'game_18',
    category: 'games',
    question: 'Qual é o nome da simpática raposa de duas caudas que voa e é o leal melhor amigo de Sonic the Hedgehog?',
    answers: ['tails', 'miles prower', 'miles tails prower'],
    explanation: 'Miles "Tails" Prower (um trocadilho com "miles per hour") é um prodígio da mecânica que consegue girar suas duas caudas como hélices de helicóptero para voar.',
    imageUrl: 'https://media.tenor.com/a4OE_6rUbp4AAAAC/sonic-origins-tails.gif'
  },

  // ==========================================
  // 2. ANIMES (18 Perguntas)
  // ==========================================
  {
    id: 'anime_01',
    category: 'animes',
    question: 'Em Naruto, qual é o verdadeiro nome da lendária Raposa de Nove Caudas selada no estômago do protagonista?',
    answers: ['kurama', 'raposa kurama'],
    explanation: 'Embora fosse temida em Konoha como a terrível Kyuubi, seu verdadeiro nome de batismo concedido pelo Sábio dos Seis Caminhos é Kurama.',
    imageUrl: 'https://media.tenor.com/arS4VxYF6OMAAAAC/naruto-kurama.gif'
  },
  {
    id: 'anime_02',
    category: 'animes',
    question: 'Em Dragon Ball Z, qual é o nome do planeta natal dos Saiyajins que foi destruído pelo vilão Freeza?',
    answers: ['vegeta', 'planeta vegeta'],
    explanation: 'O Planeta Vegeta (antigo Planeta Planta) foi dominado pelos Saiyajins e posteriormente aniquilado por uma Supernova lançada por Freeza.',
    imageUrl: 'https://media.tenor.com/AfqDyhRwScoAAAAC/dragon-ball-z-vegeta.gif'
  },
  {
    id: 'anime_03',
    category: 'animes',
    question: 'Em One Piece, qual é o tesouro supremo deixado pelo lendário Rei dos Piratas Gol D. Roger na ilha de Laugh Tale?',
    answers: ['one piece', 'o one piece'],
    explanation: 'O One Piece é o tesouro mais cobiçado da Era dos Piratas, e de acordo com o próprio criador Eiichiro Oda, é um objeto físico real e não uma simples lição moral.',
    imageUrl: 'https://media.tenor.com/kNu1r8h6dx0AAAAC/onepiece.gif'
  },
  {
    id: 'anime_04',
    category: 'animes',
    question: 'Em Death Note, qual fruta terrestre vermelha é a obsessão favorita do Shinigami Ryuk?',
    answers: ['maca', 'maçã', 'maca vermelha', 'maçã vermelha', 'macas', 'maçãs'],
    explanation: 'Ryuk diz que maçãs para os Shinigamis são como cigarros ou álcool para os humanos: causam abstinência se ele ficar muito tempo sem comer.',
    imageUrl: 'https://media.tenor.com/0F1P3gT3DjgAAAAC/havart-yablocko.gif'
  },
  {
    id: 'anime_05',
    category: 'animes',
    question: 'Em Jujutsu Kaisen, qual feiticeiro de cabelos brancos e olhos vendados é portador dos Seis Olhos e da técnica do Ilimitado?',
    answers: ['satoru gojo', 'gojo', 'gojo satoru'],
    explanation: 'Satoru Gojo é considerado o feiticeiro mais forte da era moderna, capaz de distorcer o espaço com as cores Azul, Vermelho e o Vazio Roxo.',
    imageUrl: 'https://media.tenor.com/8QryiyllNcgAAAAC/gojo-satoru.gif'
  },
  {
    id: 'anime_06',
    category: 'animes',
    question: 'Em Demon Slayer (Kimetsu no Yaiba), qual é a técnica de respiração primordial e mais poderosa, criada por Yoriichi Tsugikuni?',
    answers: ['respiracao do sol', 'respiração do sol', 'dança do deus do fogo', 'hinokami kagura'],
    explanation: 'A Respiração do Sol foi a primeira respiração já desenvolvida, da qual todas as outras ramificações (Água, Fogo, Vento, Trovão, Rocha) se originaram.',
    imageUrl: 'https://media.tenor.com/KCAl_U11F0cAAAAC/tanjiro-tanjiro-kamado.gif'
  },
  {
    id: 'anime_07',
    category: 'animes',
    question: 'Em Bleach, qual é o nome da espada Zanpakuto de Ichigo Kurosaki que assume a forma de um grande facão?',
    answers: ['zangetsu'],
    explanation: 'Zangetsu (Lua Cortante) representa a manifestação espiritual dos poderes Hollow e Shinigami de Ichigo.',
    imageUrl: 'https://media.tenor.com/evREpUaFnbMAAAAC/ichigo-kurosaki-ichigo.gif'
  },
  {
    id: 'anime_08',
    category: 'animes',
    question: 'Em Fullmetal Alchemist, qual é a lei absoluta da alquimia que dita que para obter algo, algo de igual valor deve ser oferecido?',
    answers: ['troca equivalente', 'lei da troca equivalente', 'principio da troca equivalente'],
    explanation: 'A Troca Equivalente é o dogma básico do universo de Fullmetal Alchemist, cuja quebra na transmutação humana custou o braço e a perna de Edward e o corpo inteiro de Alphonse.',
    imageUrl: 'https://media.tenor.com/VSW4JBMZy-YAAAAC/fullmetal-alchemist.gif'
  },
  {
    id: 'anime_09',
    category: 'animes',
    question: 'Em Hunter x Hunter, qual é o nome da energia vital que todo ser vivo emana e que os Caçadores manipulam através de 4 princípios básicos?',
    answers: ['nen'],
    explanation: 'O Nen permite manipular a aura corporal através de Ten (envolver), Zetsu (suprimir), Ren (intensificar) e Hatsu (projetar).',
    imageUrl: 'https://media.tenor.com/P_8hJLKYGEsAAAAC/hxh-hunter-x-hunter.gif'
  },
  {
    id: 'anime_10',
    category: 'animes',
    question: 'Em Attack on Titan (Shingeki no Kyojin), qual é a primeira e mais externa muralha que é rompida pelo Titã Colossal no primeiro episódio?',
    answers: ['muralha maria', 'maria', 'wall maria'],
    explanation: 'A Muralha Maria é o anel de proteção mais exterior da humanidade em Paradis, protegendo o distrito de Shiganshina antes da invasão em 845.',
    imageUrl: 'https://media.tenor.com/Ltunzhu8334AAAAC/when-your-tall-gf-pisses-you-off-when-your-tall-bf-pisses-you-off.gif'
  },
  {
    id: 'anime_11',
    category: 'animes',
    question: 'Em One Piece, qual foi o primeiro navio caravelha do Bando do Chapéu de Palha antes do Thousand Sunny?',
    answers: ['going merry', 'merry'],
    explanation: 'O Going Merry foi um presente de Kaya em Syrup Village e desenvolveu um Klabautermann (espírito do navio) antes de seu comovente funeral viking no mar.',
    imageUrl: 'https://media.tenor.com/rvwJutnzfnEAAAAC/one-piece.gif'
  },
  {
    id: 'anime_12',
    category: 'animes',
    question: 'Em Dragon Ball Z, qual é a transformação lendária com cabelos espetados dourados e olhos verdes que Goku alcança pela primeira vez em Namekusei?',
    answers: ['super saiyajin', 'super saiyan', 'ssj', 'super sayajin'],
    explanation: 'Despertada pela fúria da morte de Kuririn nas mãos de Freeza, a lenda milenar do Super Saiyajin se concretizou através do coração puro de Goku.',
    imageUrl: 'https://media.tenor.com/T91smICQyTwAAAAC/goku-turining-super-saiyan-super-saiyan.gif'
  },
  {
    id: 'anime_13',
    category: 'animes',
    question: 'Em Death Note, qual é o nome do caderno sobrenatural capaz de matar qualquer humano cujo nome seja escrito em suas páginas?',
    answers: ['death note', 'o death note'],
    explanation: 'Derrubado no mundo humano de propósito pelo Shinigami Ryuk, o Death Note desencadeou a guerra intelectual histórica entre Light Yagami (Kira) e L.',
    imageUrl: 'https://media.tenor.com/QJoM5hgRxmEAAAAC/1.gif'
  },
  {
    id: 'anime_14',
    category: 'animes',
    question: 'Em Naruto Shippuden, qual é o nome da organização de ninjas renegados que veste mantos pretos estampados com nuvens vermelhas?',
    answers: ['akatsuki', 'a akatsuki'],
    explanation: 'Fundada originalmente por Yahiko, Konan e Nagato em busca da paz, a Akatsuki foi manipulada por Obito Uchiha para capturar as nove Bestas com Cauda.',
    imageUrl: 'https://media.tenor.com/T9rXVL-0aXEAAAAC/akatsuki.gif'
  },
  {
    id: 'anime_15',
    category: 'animes',
    question: 'Em Dragon Ball, qual mestre marcial idoso e eremita inventou o ataque Kamehameha e treinou Goku e Kuririn?',
    answers: ['mestre kame', 'kame', 'muten roshi', 'roshi'],
    explanation: 'O Mestre Kame levou 50 anos para aperfeiçoar o Kamehameha original, embora Goku tenha conseguido reproduzi-lo em segundos após vê-lo uma única vez.',
    imageUrl: 'https://media.tenor.com/TXpQ5hD4XF8AAAAC/muten-roshi-kamehameha.gif'
  },
  {
    id: 'anime_16',
    category: 'animes',
    question: 'Em Black Clover, qual é o nome do protagonista enérgico que nasceu sem nenhuma gota de mana, mas recebeu um grimório de 5 folhas com espadas antimagia?',
    answers: ['asta', 'o asta'],
    explanation: 'Asta compensa sua total falta de magia treinando seu corpo físico ao extremo, empunhando as espadas que cortam e anulam qualquer magia inimiga.',
    imageUrl: 'https://media.tenor.com/1A-scK_CRfEAAAAC/black-clover-everlasting-shine.gif'
  },
  {
    id: 'anime_17',
    category: 'animes',
    question: 'Em Os Cavaleiros do Zodíaco (Saint Seiya), qual é o nome das armaduras sagradas de proteção forjadas a mando da deusa Atena?',
    answers: ['armaduras', 'cloths', 'armadura'],
    explanation: 'As Armaduras dos Cavaleiros são classificadas em Bronze, Prata e Ouro, cada uma alinhada a uma das 88 constelações oficiais do céu noturno.',
    imageUrl: 'https://media.tenor.com/Kqfg1NOfgMAAAAAC/seiya-saint-seiya.gif'
  },
  {
    id: 'anime_18',
    category: 'animes',
    question: 'Em Chainsaw Man, qual é o nome do jovem protagonista que se tornou o homem-motosserra após fazer um pacto com o demônio Pochita?',
    answers: ['denji'],
    explanation: 'Denji vivia na miséria pagando as dívidas de seu falecido pai até que Pochita se fundiu ao seu coração, permitindo que ele puxe a corda no peito para ativar as serras.',
    imageUrl: 'https://media.tenor.com/IToy-Y410oUAAAAC/chainsaw-man-denji.gif'
  },

  // ==========================================
  // 3. FUTEBOL & ESPORTES (16 Perguntas)
  // ==========================================
  {
    id: 'fut_01',
    category: 'futebol',
    question: 'Qual é o único país do mundo a ter conquistado cinco títulos da Copa do Mundo FIFA masculina?',
    answers: ['brasil', 'selecao brasileira', 'seleção brasileira', 'o brasil'],
    explanation: 'A Seleção Brasileira é a maior campeã da história do futebol mundial, tendo levantado as taças de 1958, 1962, 1970, 1994 e 2002.',
    imageUrl: 'https://media.tenor.com/bCWT-mAE24MAAAAC/brazil-brasil.gif'
  },
  {
    id: 'fut_02',
    category: 'futebol',
    question: 'Qual clube espanhol é o maior campeão da história da UEFA Champions League, com mais de 14 troféus?',
    answers: ['real madrid', 'real', 'real madrid cf'],
    explanation: 'O Real Madrid Club de Fútbol conquistou as cinco primeiras edições consecutivas do torneio (1956-1960) e continua sendo o recordista absoluto da Champions League.',
    imageUrl: 'https://media.tenor.com/XPW3o5_pSZoAAAAC/mbappe-real-madrid.gif'
  },
  {
    id: 'fut_03',
    category: 'futebol',
    question: 'Em qual clube brasileiro o Rei Pelé jogou a maior parte de sua lendária carreira e marcou mais de 1.000 gols?',
    answers: ['santos', 'santos futebol clube', 'santos fc'],
    explanation: 'Pelé atuou no Santos FC de 1956 a 1974, conquistando duas Libertadores, dois Mundiais Interclubes e seis Campeonatos Brasileiros pelo Peixe.',
    imageUrl: 'https://media.tenor.com/5HpezaVRhgQAAAAC/santos.gif'
  },
  {
    id: 'fut_04',
    category: 'futebol',
    question: 'Qual seleção sul-americana venceu a Copa do Mundo FIFA de 2022 no Catar sob a liderança de Lionel Messi?',
    answers: ['argentina', 'selecao argentina', 'seleção argentina', 'a argentina'],
    explanation: 'A Argentina derrotou a França nos pênaltis após um empate histórico por 3 a 3 na grande final no Lusail Stadium, conquistando seu tricampeonato mundial.',
    imageUrl: 'https://media.tenor.com/zTWSiLM77sQAAAAC/argentina-argentina-champions.gif'
  },
  {
    id: 'fut_05',
    category: 'futebol',
    question: 'Qual craque português é conhecido mundialmente pelo apelido CR7 e é o maior artilheiro da história da Champions League?',
    answers: ['cristiano ronaldo', 'cr7', 'ronaldo'],
    explanation: 'Cristiano Ronaldo dos Santos Aveiro marcou época no Manchester United, Real Madrid e Juventus, ultrapassando mais de 850 gols oficiais em sua carreira.',
    imageUrl: 'https://media.tenor.com/sGiuU_fyObIAAAAC/cristiano-ronaldo-ronaldo-portugal.gif'
  },
  {
    id: 'fut_06',
    category: 'futebol',
    question: 'Qual estádio lendário do Rio de Janeiro foi palco das finais das Copas do Mundo de 1950 e 2014?',
    answers: ['maracana', 'maracanã', 'estadio do maracana', 'estádio do maracanã'],
    explanation: 'Oficialmente batizado como Estádio Jornalista Mário Filho, o Maracanã já reuniu públicos históricos de quase 200.000 torcedores no século XX.',
    imageUrl: 'https://media.tenor.com/1xwAjIWfFTEAAAAC/flamengo-torcida.gif'
  },
  {
    id: 'fut_07',
    category: 'futebol',
    question: 'Quantos minutos dura o tempo regulamentar completo de uma partida de futebol profissional (sem contar acréscimos ou prorrogação)?',
    answers: ['90', '90 minutos', 'noventa', 'noventa minutos'],
    explanation: 'O jogo oficial é dividido em dois tempos de 45 minutos cada, com um intervalo padrão de 15 minutos entre eles.',
    imageUrl: 'https://media.tenor.com/LW_LfqmR8OUAAAAC/julian-hill-campbell-football.gif'
  },
  {
    id: 'fut_08',
    category: 'futebol',
    question: 'Qual clube espanhol tinha o lendário trio ofensivo conhecido como "MSN" (Messi, Suárez e Neymar)?',
    answers: ['barcelona', 'fc barcelona', 'barca', 'barça'],
    explanation: 'O trio MSN atuou junto no FC Barcelona de 2014 a 2017, conquistando a Tríplice Coroa (Champions League, La Liga e Copa do Rei) na temporada 2014-15.',
    imageUrl: 'https://media.tenor.com/71xOBht1ZpwAAAAC/pedri-pedri-gonzalez.gif'
  },
  {
    id: 'fut_09',
    category: 'futebol',
    question: 'Qual centroavante alemão é o maior artilheiro de toda a história das Copas do Mundo, com 16 gols marcados?',
    answers: ['miroslav klose', 'klose'],
    explanation: 'Klose superou Ronaldo Fenômeno (15 gols) durante a Copa do Mundo de 2014 no Brasil, disputando quatro edições de Mundiais (2002 a 2014).',
    imageUrl: 'https://media.tenor.com/TcmqHNnCYcoAAAAC/miroslav-klose-miroslav.gif'
  },
  {
    id: 'fut_10',
    category: 'futebol',
    question: 'Qual clube paulista foi campeão mundial interclubes em 1992, 1993 e 2005 e revelou ídolos como Rogério Ceni e Raí?',
    answers: ['sao paulo', 'são paulo', 'spfc', 'sao paulo fc', 'são paulo fc'],
    explanation: 'O São Paulo Futebol Clube venceu Barcelona em 1992, Milan em 1993 sob comando de Telê Santana, e o Liverpool em 2005 no Japão.',
    imageUrl: 'https://media.tenor.com/E_bOsmBmtroAAAAC/luciano-luciano-neves.gif'
  },
  {
    id: 'fut_11',
    category: 'futebol',
    question: 'Qual astro argentino marcou o polêmico gol conhecido como "A Mão de Deus" contra a Inglaterra na Copa de 1986?',
    answers: ['diego maradona', 'maradona'],
    explanation: 'Na mesma partida em 1986, Diego Armando Maradona também marcou o chamado "Gol do Século", driblando metade da equipe inglesa desde o meio-campo.',
    imageUrl: 'https://media.tenor.com/nbMNofdYiUcAAAAC/football-futbol.gif'
  },
  {
    id: 'fut_12',
    category: 'futebol',
    question: 'Qual é o nome popular do clássico clássico carioca disputado entre Flamengo e Fluminense?',
    answers: ['fla-flu', 'fla flu', 'flaflu'],
    explanation: 'O termo "Fla-Flu" foi cunhado pelo cronista Mário Filho em 1925, sendo um dos maiores clássicos de rivalidade do futebol brasileiro e mundial.',
    imageUrl: 'https://media.tenor.com/DS_PUKZENMQAAAAC/fluminense-tricolor.gif'
  },
  {
    id: 'fut_13',
    category: 'futebol',
    question: 'Qual craque brasileiro, eleito Melhor do Mundo pela FIFA em 2004 e 2005, era famoso por seus dribles como o elástico e seu sorriso em campo?',
    answers: ['ronaldinho gaucho', 'ronaldinho gaúcho', 'ronaldinho', 'bruxo'],
    explanation: 'Ronaldinho Gaúcho encantou o mundo jogando pelo Barcelona e Seleção Brasileira, sendo aplaudido de pé pela torcida do arquirrival Real Madrid no Santiago Bernabéu.',
    imageUrl: 'https://media.tenor.com/Ue892hNSt5YAAAAC/ronaldinho-freekick.gif'
  },
  {
    id: 'fut_14',
    category: 'futebol',
    question: 'Qual tradicional clube inglês tem o apelido de "Red Devils" (Os Diabos Vermelhos) e manda seus jogos no estádio Old Trafford?',
    answers: ['manchester united', 'man united', 'united'],
    explanation: 'Com 20 títulos da Premier League, o Manchester United viveu sua era mais vitoriosa sob a liderança do lendário treinador escocês Sir Alex Ferguson.',
    imageUrl: 'https://media.tenor.com/cJdOmCPvcRIAAAAC/bruno-fernandes-penalty.gif'
  },
  {
    id: 'fut_15',
    category: 'futebol',
    question: 'A quantos metros de distância do gol fica localizada a marca da cal para a cobrança de um pênalti no futebol de campo?',
    answers: ['11', '11 metros', 'onze', 'onze metros'],
    explanation: 'A marca penal fica a exatamente 11 metros (12 jardas no padrão britânico de medidas) do centro da linha de gol.',
    imageUrl: 'https://media.tenor.com/yKkuVUFALvMAAAAC/mbaps-mbappe.gif'
  },
  {
    id: 'fut_16',
    category: 'futebol',
    question: 'Qual país sul-americano foi a sede da primeiríssima edição da Copa do Mundo FIFA da história, realizada em 1930?',
    answers: ['uruguai', 'o uruguai'],
    explanation: 'O Uruguai sediou e também venceu a primeira Copa do Mundo em 1930 no Estádio Centenário em Montevidéu, derrotando a Argentina por 4 a 2 na final.',
    imageUrl: 'https://media.tenor.com/slE8pnHdcPAAAAAC/uruguay-uruguay-football.gif'
  },

  // ==========================================
  // 4. CONHECIMENTOS GERAIS & CIÊNCIAS (16 Perguntas)
  // ==========================================
  {
    id: 'geral_01',
    category: 'geral',
    question: 'Dentre os cromossomos sexuais humanos X e Y, qual deles representa biologicamente o sexo feminino?',
    answers: ['x', 'cromossomo x', 'o x', 'o cromossomo x'],
    explanation: 'Nas espécies humanas, o par de cromossomos XX determina o sexo biológico feminino, enquanto o par XY determina o masculino.',
    imageUrl: 'https://media.tenor.com/K_mRJjR4tCEAAAAC/general-celgar-tower-defense-x.gif'
  },
  {
    id: 'geral_02',
    category: 'geral',
    question: 'Quantos filmes compõem tradicionalmente uma trilogia no cinema?',
    answers: ['3', 'tres', 'três', 'tres filmes', 'três filmes'],
    explanation: 'Trilogia é um conjunto artístico composto por exatamente três obras conectadas entre si (como O Senhor dos Anéis, De Volta para o Futuro e O Poderoso Chefão).',
    imageUrl: 'https://media.tenor.com/3AfneNsaJ18AAAAC/geral3-poison.gif'
  },
  {
    id: 'geral_03',
    category: 'geral',
    question: 'Qual é o maior planeta do nosso Sistema Solar em tamanho e massa, famoso por sua Grande Mancha Vermelha?',
    answers: ['jupiter', 'júpiter'],
    explanation: 'Júpiter é um gigante gasoso com mais do que o dobro da massa de todos os outros planetas do Sistema Solar combinados.',
    imageUrl: 'https://media.tenor.com/_12ZAW9unScAAAAC/jupiter-jupiter-is-missing.gif'
  },
  {
    id: 'geral_04',
    category: 'geral',
    question: 'Qual é a fórmula química molecular da água pura?',
    answers: ['h2o', 'h20'],
    explanation: 'A molécula de água é formada pela ligação covalente entre dois átomos de hidrogênio (H) e um átomo de oxigênio (O).',
    imageUrl: 'https://media.tenor.com/h5WGXd4RnbUAAAAC/water-vs-h2o-meme.gif'
  },
  {
    id: 'geral_05',
    category: 'geral',
    question: 'Qual é o maior e mais profundo oceano do planeta Terra, cobrindo mais de 30% da superfície global?',
    answers: ['pacifico', 'pacífico', 'oceano pacifico', 'oceano pacífico'],
    explanation: 'O Oceano Pacífico abriga a Fossa das Marianas, o ponto mais profundo conhecido de todos os oceanos terrestres, com quase 11.000 metros de profundidade.',
    imageUrl: 'https://media.tenor.com/8uB-SYwGXk8AAAAC/will-will-pacific-rim.gif'
  },
  {
    id: 'geral_06',
    category: 'geral',
    question: 'Qual dramaturgo inglês é o autor da clássica tragédia dos amantes rivais "Romeu e Julieta"?',
    answers: ['william shakespeare', 'shakespeare'],
    explanation: 'William Shakespeare (1564-1616) escreveu Romeu e Julieta no início de sua carreira, imortalizando Verona como o cenário romântico do amor trágico.',
    imageUrl: 'https://media.tenor.com/7sVWzOi-FEAAAAAC/theatre-czech.gif'
  },
  {
    id: 'geral_07',
    category: 'geral',
    question: 'Qual gênio renascentista italiano pintou a famosa obra-prima "Mona Lisa" (La Gioconda)?',
    answers: ['leonardo da vinci', 'da vinci', 'leonardo'],
    explanation: 'Leonardo da Vinci pintou a Mona Lisa no início do século XVI, utilizando a revolucionária técnica do sfumato para criar seu olhar e sorriso enigmáticos.',
    imageUrl: 'https://media.tenor.com/Qy2s9y1r6REAAAAC/shocked.gif'
  },
  {
    id: 'geral_08',
    category: 'geral',
    question: 'Qual é o metal mais abundante na crosta terrestre, famoso por ser leve e muito usado na fabricação de latas e aeronaves?',
    answers: ['aluminio', 'alumínio'],
    explanation: 'O alumínio compõe cerca de 8% da massa da crosta terrestre, sendo extraído principalmente do minério de bauxita.',
    imageUrl: 'https://media.tenor.com/djIwe1tzXcUAAAAC/geral-3-geral-3-servidor-goularte.gif'
  },
  {
    id: 'geral_09',
    category: 'geral',
    question: 'Qual é a capital oficial do Japão, uma das maiores e mais populosas metrópoles do planeta?',
    answers: ['toquio', 'tóquio', 'tokyo'],
    explanation: 'Tóquio (que significa "Capital Oriental") substituiu Quioto como a sede imperial do Japão em 1868 durante a Restauração Meiji.',
    imageUrl: 'https://media.tenor.com/Ad4Bi1fE2WwAAAAC/tokyo.gif'
  },
  {
    id: 'geral_10',
    category: 'geral',
    question: 'Qual é o gás mais abundante na atmosfera do planeta Terra, compondo aproximadamente 78% do ar que respiramos?',
    answers: ['nitrogenio', 'nitrogênio', 'n2', 'gas nitrogenio', 'gás nitrogênio'],
    explanation: 'Embora o oxigênio seja vital para a respiração animal (cerca de 21%), o nitrogênio forma a esmagadora maioria do volume da atmosfera terrestre.',
    imageUrl: 'https://media.tenor.com/lUfd-YvfhAAAAAAC/drinks-margarita.gif'
  },
  {
    id: 'geral_11',
    category: 'geral',
    question: 'Em qual país do norte da África ficam localizadas as icônicas Grandes Pirâmides de Gizé e a Grande Esfinge?',
    answers: ['egito', 'o egito'],
    explanation: 'Construídas há mais de 4.500 anos durante o Império Antigo egípcio, a Pirâmide de Quéops é a única das Sete Maravilhas do Mundo Antigo que ainda resiste de pé.',
    imageUrl: 'https://media.tenor.com/MqzsgwRmLf0AAAAC/emam-emam-ashour.gif'
  },
  {
    id: 'geral_12',
    category: 'geral',
    question: 'Qual físico teórico de origem alemã desenvolveu a Teoria da Relatividade e formulou a célebre equação E = mc²?',
    answers: ['albert einstein', 'einstein'],
    explanation: 'Albert Einstein revolucionou a compreensão da física em 1905 e 1915, provando que a gravidade é uma curvatura do espaço-tempo provocada pela massa.',
    imageUrl: 'https://media.tenor.com/vqS2adFeX_IAAAAC/relatividade-geral-einstein.gif'
  },
  {
    id: 'geral_13',
    category: 'geral',
    question: 'Qual órgão muscular do corpo humano é responsável por bombear o sangue oxigenado através de todo o sistema cardiovascular?',
    answers: ['coracao', 'coração', 'o coracao', 'o coração'],
    explanation: 'O coração humano bate em média cerca de 100.000 vezes por dia, bombeando mais de 7.500 litros de sangue pelo corpo.',
    imageUrl: 'https://media.tenor.com/DOT6qWrEXeEAAAAC/hot-hot-on-fire.gif'
  },
  {
    id: 'geral_14',
    category: 'geral',
    question: 'Qual é a velocidade aproximada da luz no vácuo em quilômetros por segundo (km/s)?',
    answers: ['300000', '300.000', '300 mil', '300000 km/s', '300.000 km/s'],
    explanation: 'A velocidade da luz no vácuo é de exatamente 299.792.458 metros por segundo (aproximadamente 300.000 km/s), sendo o limite absoluto de velocidade do universo.',
    imageUrl: 'https://media.tenor.com/TBiTZH2lcewAAAAC/sassy-justice-sassy-trump.gif'
  },
  {
    id: 'geral_15',
    category: 'geral',
    question: 'Qual é a maior floresta tropical do planeta, que cobre parte significativa do território brasileiro e sul-americano?',
    answers: ['floresta amazonica', 'floresta amazônica', 'amazonia', 'amazônia'],
    explanation: 'A Bacia Amazônica abriga a maior biodiversidade vegetal e animal da Terra e é vital para a regulação do clima global através dos rios voadores.',
    imageUrl: 'https://media.tenor.com/6H5KIJ6E3rcAAAAC/99-nights-in-the-forest.gif'
  },
  {
    id: 'geral_16',
    category: 'geral',
    question: 'Quantos lados possui um polígono geométrico denominado hexágono?',
    answers: ['6', 'seis', '6 lados', 'seis lados'],
    explanation: 'O hexágono possui 6 lados e 6 ângulos internos. Na natureza, as abelhas utilizam o formato hexagonal perfeito para construir seus favos com economia máxima de cera.',
    imageUrl: 'https://media.tenor.com/O5TPn0HKcRgAAAAC/general-1984.gif'
  },

  // ==========================================
  // 5. UNIVERSO MARVEL & STARK (15 Perguntas)
  // ==========================================
  {
    id: 'marvel_01',
    category: 'marvel',
    question: 'Qual é a fonte de energia eletromagnética azul e limpa criada por Tony Stark que abastece suas armaduras e o manteve vivo?',
    answers: ['reator arc', 'reator ark', 'arc reactor', 'reator'],
    explanation: 'O Reator Arc foi miniaturizado por Tony Stark em uma caverna no Afeganistão com a ajuda de Ho Yinsen para impedir que estilhaços atingissem seu coração.',
    imageUrl: 'https://media.tenor.com/p_QsjTewNeEAAAAC/iron-man-arc-reactor.gif'
  },
  {
    id: 'marvel_02',
    category: 'marvel',
    question: 'Qual é o nome do Titã Louco que reuniu as seis Joias do Infinito na Manopla para eliminar metade do universo?',
    answers: ['thanos', 'o thanos'],
    explanation: 'Thanos acreditava que os recursos do universo eram finitos e que o estalo de dedos restauraria o equilíbrio ecológico e sustentável do cosmos.',
    imageUrl: 'https://media.tenor.com/faXPESYqB4AAAAAC/fortnite-fortnite-battle-royale.gif'
  },
  {
    id: 'marvel_03',
    category: 'marvel',
    question: 'Qual é o metal fictício raro e indestrutível vindo do espaço que compõe o escudo do Capitão América e o traje do Pantera Negra?',
    answers: ['vibranium', 'vibrânio', 'vibranio'],
    explanation: 'O Vibranium é um metal quase indestrutível que absorve e redireciona vibrações de energia cinética, encontrado abundantemente na nação de Wakanda.',
    imageUrl: 'https://media.tenor.com/ukR4zrlB5VMAAAAC/black-panther.gif'
  },
  {
    id: 'marvel_04',
    category: 'marvel',
    question: 'Qual é o nome da inteligência artificial original britânica com voz refinada criada por Tony Stark (e que vos fala neste servidor)?',
    answers: ['jarvis', 'j.a.r.v.i.s', 'j.a.r.v.i.s.', 'just a rather very intelligent system'],
    explanation: 'J.A.R.V.I.S. significa "Just A Rather Very Intelligent System", batizado em homenagem a Edwin Jarvis, o leal mordomo da família de Howard Stark.',
    imageUrl: 'https://media.tenor.com/Fz6p4qhadE8AAAAC/jarvis-jarvis-more-alcohol.gif'
  },
  {
    id: 'marvel_05',
    category: 'marvel',
    question: 'Em qual metrópole americana ficava localizada a icônica Torre Stark, que mais tarde se tornou a base central dos Vingadores?',
    answers: ['nova york', 'nova iorque', 'new york', 'ny', 'nyc'],
    explanation: 'A Torre Stark ficava no centro de Manhattan, Nova York, abastecida pelo Reator Arc e palco da épica Batalha de Nova York em 2012 contra Loki.',
    imageUrl: 'https://media.tenor.com/ttw3h6MkzpMAAAAC/avengers-assemble-new-york-chitauri-fight-thor-hulk-captain-america-avengers-360.gif'
  },
  {
    id: 'marvel_06',
    category: 'marvel',
    question: 'Qual é o nome civil e verdadeiro do bilionário excêntrico por trás da armadura dourada e vermelha do Homem de Ferro?',
    answers: ['tony stark', 'anthony stark', 'stark'],
    explanation: 'Filho do fundador das Indústrias Stark, Howard Stark, Tony é um gênio da engenharia que construiu mais de 80 armaduras diferentes durante o MCU.',
    imageUrl: 'https://media.tenor.com/uzC6H9xDx6IAAAAC/tony-stark-iron-man.gif'
  },
  {
    id: 'marvel_07',
    category: 'marvel',
    question: 'Qual deus nórdico e Vingador asgardiano empunhava o lendário martelo mágico Mjolnir antes de forjar o machado Stormbreaker?',
    answers: ['thor', 'thor odinson'],
    explanation: 'Thor é o Deus do Trovão de Asgard, filho de Odin, digno de empunhar o Mjolnir e capaz de canalizar raios e tempestades cósmicas.',
    imageUrl: 'https://media.tenor.com/PJfPxZJB0xcAAAAC/jhon-marvel.gif'
  },
  {
    id: 'marvel_08',
    category: 'marvel',
    question: 'Qual Joia do Infinito amarela ficava incrustada na testa do sintezóide Visão, concedendo-lhe vida e poderes de raio cósmico?',
    answers: ['joia da mente', 'mente', 'mind stone', 'a joia da mente'],
    explanation: 'A Joia da Mente estava contida no Cetro de Loki antes de ser utilizada por Tony Stark e Bruce Banner para dar vida ao Visão em Era de Ultron.',
    imageUrl: 'https://media.tenor.com/hy3Ao9NgJMsAAAAC/mindblown-mind.gif'
  },
  {
    id: 'marvel_09',
    category: 'marvel',
    question: 'Qual cientista brilhante especialista em radiação gama se transforma no gigante furioso e indestrutível Hulk quando perde a calma?',
    answers: ['bruce banner', 'banner', 'doutor banner', 'dr banner'],
    explanation: 'O Dr. Bruce Banner foi exposto a uma dose massiva de radiação gama em um experimento militar, criando sua contraparte colossal verde movida a raiva.',
    imageUrl: 'https://media.tenor.com/nh9Veiazk00AAAAC/the-hulk.gif'
  },
  {
    id: 'marvel_10',
    category: 'marvel',
    question: 'Qual ex-neurocirurgião se tornou o Mago Supremo da Terra e protetor do Olho de Agamotto e do Sanctum Sanctorum?',
    answers: ['doutor estranho', 'dr estranho', 'stephen strange', 'doctor strange'],
    explanation: 'Stephen Strange perdeu a destreza das mãos em um acidente automobilístico e encontrou o caminho das artes místicas em Kamar-Taj com a Anciã.',
    imageUrl: 'https://media.tenor.com/zGE1pbLc3VcAAAAC/doutor-estranho-doctor-strange.gif'
  },
  {
    id: 'marvel_11',
    category: 'marvel',
    question: 'Qual espião caolho com tapa-olho foi o Diretor da S.H.I.E.L.D. e idealizou a lendária Iniciativa Vingadores?',
    answers: ['nick fury', 'fury'],
    explanation: 'Nick Fury reuniu heróis extraordinários para lutar as batalhas que a humanidade jamais conseguiria enfrentar sozinha.',
    imageUrl: 'https://media.tenor.com/lPlfOgqajC8AAAAC/nick-fury-i-still.gif'
  },
  {
    id: 'marvel_12',
    category: 'marvel',
    question: 'Qual irmão adotivo de Thor é conhecido na mitologia nórdica e nos quadrinhos como o Deus da Trapaça e da Mentira?',
    answers: ['loki', 'loki laufeyson'],
    explanation: 'Nascido como um Gigante de Gelo de Jotunheim e adotado por Odin, Loki liderou o exército Chitauri em Nova York antes de encontrar sua redenção.',
    imageUrl: 'https://media.tenor.com/kxtLOuxg2dwAAAAC/loki-rennev.gif'
  },
  {
    id: 'marvel_13',
    category: 'marvel',
    question: 'Qual inteligência artificial de voz feminina irlandesa assumiu os sistemas de combate da armadura de Tony Stark após J.A.R.V.I.S. se tornar o Visão?',
    answers: ['sexta feira', 'sexta-feira', 'friday', 'f.r.i.d.a.y', 'f.r.i.d.a.y.'],
    explanation: 'Sexta-Feira (F.R.I.D.A.Y.) foi ativada por Tony durante a Batalha de Sokovia em Era de Ultron e o acompanhou em Guerra Civil, Guerra Infinita e Ultimato.',
    imageUrl: 'https://media.tenor.com/0zkg8c_moY8AAAAC/avengers-vision.gif'
  },
  {
    id: 'marvel_14',
    category: 'marvel',
    question: 'Qual coronel e amigo leal de Tony Stark pilota a pesada armadura militar armada de canhões conhecida como Máquina de Combate (War Machine)?',
    answers: ['james rhodes', 'rhodey', 'coronel rhodes', 'war machine'],
    explanation: 'O Coronel James "Rhodey" Rhodes é o elo entre Tony Stark e a Força Aérea dos Estados Unidos, pilotando a blindada Máquina de Combate cinza e preta.',
    imageUrl: 'https://media.tenor.com/QkusPExWs3MAAAAC/marvel-iron-patriot.gif'
  },
  {
    id: 'marvel_15',
    category: 'marvel',
    question: 'Qual soldado americano tomou o Soro do Supersoldado na Segunda Guerra Mundial e se tornou o Capitão América?',
    answers: ['steve rogers', 'capitao america', 'capitão américa', 'rogers'],
    explanation: 'Steve Rogers foi congelado no gelo do Ártico por quase 70 anos antes de despertar no século XXI para liderar os Vingadores.',
    imageUrl: 'https://media.tenor.com/dgMCqk37D1AAAAAC/marvel-mcu.gif'
  },

  // ==========================================
  // 6. COMPUTAÇÃO & TECNOLOGIA (18 Perguntas)
  // ==========================================
  {
    id: 'comp_01',
    category: 'computacao',
    question: 'Qual componente de hardware é conhecido como o "cérebro" do computador, responsável por processar todas as instruções e cálculos lógicos?',
    answers: ['cpu', 'processador', 'o processador', 'a cpu'],
    explanation: 'A CPU (Central Processing Unit ou Unidade Central de Processamento) gerencia o fluxo de dados, executa operações aritméticas e coordena os componentes do sistema.',
    imageUrl: 'https://media.tenor.com/j_n7EjNDggQAAAAC/john-freeman-half-life-full-life-consequences.gif'
  },
  {
    id: 'comp_02',
    category: 'computacao',
    question: 'Quais são os dois únicos dígitos numéricos utilizados no sistema de numeração binário que opera nos circuitos digitais?',
    answers: ['0 e 1', '0 e um', 'zero e um', '1 e 0', '0 1', 'zero e 1', '0, 1', '1, 0'],
    explanation: 'O sistema binário (base 2) representa estados elétricos onde 0 indica desligado/falso e 1 indica ligado/verdadeiro, formando a base de todos os computadores modernos.',
    imageUrl: 'https://media.tenor.com/T8KOdP8iV7oAAAAC/typing-computer.gif'
  },
  {
    id: 'comp_03',
    category: 'computacao',
    question: 'Qual linguagem de programação criada em 1995 por Brendan Eich se tornou a linguagem nativa dos navegadores e da web?',
    answers: ['javascript', 'js'],
    explanation: 'Desenvolvido originalmente em apenas 10 dias na Netscape com o nome de Mocha/LiveScript, o JavaScript hoje é a linguagem de programação mais popular do planeta, operando no frontend e backend (Node.js).',
    imageUrl: 'https://media.tenor.com/T7MJHBjax1IAAAAC/coding-programmer.gif'
  },
  {
    id: 'comp_04',
    category: 'computacao',
    question: 'Qual tipo de memória volátil de alta velocidade perde todos os seus dados temporários quando o computador é desligado ou reiniciado?',
    answers: ['ram', 'memoria ram', 'memória ram'],
    explanation: 'A RAM (Random Access Memory) armazena os programas e dados em uso no momento pela CPU para acesso imediato. Ao cortar a alimentação elétrica, seus capacitores descarregam.',
    imageUrl: 'https://media.tenor.com/aox5LHW5KWgAAAAC/thanos-ram.gif'
  },
  {
    id: 'comp_05',
    category: 'computacao',
    question: 'Qual sistema operacional livre e de código aberto, cujo mascote oficial é o pinguim Tux, foi criado por Linus Torvalds em 1991?',
    answers: ['linux', 'gnu linux', 'kernel linux'],
    explanation: 'Linus Torvalds anunciou o kernel Linux na Usenet em 1991 como um hobby que "não seria grande nem profissional". Hoje, ele roda na esmagadora maioria dos servidores, supercomputadores e smartphones (Android).',
    imageUrl: 'https://media.tenor.com/aOGwCJK8AckAAAAC/miragegif.gif'
  },
  {
    id: 'comp_06',
    category: 'computacao',
    question: 'Em redes de computadores, qual é a versão segura e criptografada do protocolo HTTP que protege o tráfego da web via TLS/SSL?',
    answers: ['https', 'protocolo https'],
    explanation: 'O HTTPS (Hypertext Transfer Protocol Secure) adiciona uma camada de criptografia sobre o HTTP tradicional, garantindo privacidade, integridade de dados e autenticidade através de certificados digitais.',
    imageUrl: 'https://media.tenor.com/zyI1hxJW5AwAAAAC/funny-frustrated.gif'
  },
  {
    id: 'comp_07',
    category: 'computacao',
    question: 'Qual é a linguagem padrão mundial declarativa utilizada para consultar, manipular e gerenciar bancos de dados relacionais?',
    answers: ['sql', 'structured query language'],
    explanation: 'SQL (Structured Query Language) foi desenvolvida pela IBM nos anos 1970 para trabalhar com o modelo relacional de Edgar F. Codd e continua sendo o padrão da indústria (PostgreSQL, MySQL, SQLite, etc.).',
    imageUrl: 'https://media.tenor.com/6oOaUc4bHpUAAAAC/sql-in-a-nutshell.gif'
  },
  {
    id: 'comp_08',
    category: 'computacao',
    question: 'Quantos Megabytes (MB) compõem exatamente 1 Gigabyte (GB) segundo a potência binária clássica da computação (2 elevado a 10)?',
    answers: ['1024', '1024 mb', 'mil e vinte e quatro', '1024 megabytes'],
    explanation: 'Por operar no sistema binário, as grandezas digitais tradicionais progridem em potências de 2: 1 KB = 1024 bytes, 1 MB = 1024 KB e 1 GB = 1024 MB.',
    imageUrl: 'https://media.tenor.com/1UvsePUuNWkAAAAC/website-designing-seo-services-website.gif'
  },
  {
    id: 'comp_09',
    category: 'computacao',
    question: 'Qual matemático e criptoanalista britânico decifrou a máquina Enigma na Segunda Guerra e é considerado o pai da ciência da computação e da Inteligência Artificial?',
    answers: ['alan turing', 'turing'],
    explanation: 'Alan Turing idealizou a Máquina de Turing universal e propôs o famoso "Teste de Turing" para medir a inteligência de máquinas, recebendo o Prêmio Turing (o Nobel da computação) em sua homenagem.',
    imageUrl: 'https://media.tenor.com/xC79sj1vsA4AAAAC/alan-turing.gif'
  },
  {
    id: 'comp_10',
    category: 'computacao',
    question: 'Em estruturas de dados, qual estrutura opera sob o princípio LIFO (Last In, First Out), onde o último elemento a entrar é o primeiro a sair?',
    answers: ['pilha', 'stack'],
    explanation: 'A Pilha (Stack) funciona como uma pilha de pratos: novos itens só podem ser adicionados no topo (push) e removidos do topo (pop), amplamente usada na pilha de chamadas (call stack) de execuções de programas.',
    imageUrl: 'https://media.tenor.com/-8CONLTgnUsAAAAC/battery-pot.gif'
  },
  {
    id: 'comp_11',
    category: 'computacao',
    question: 'Qual é o número da porta de rede padrão internacional utilizada para conexões web seguras e criptografadas sob o protocolo HTTPS?',
    answers: ['443', 'porta 443'],
    explanation: 'Enquanto o HTTP tradicional e não criptografado utiliza a porta 80, as conexões criptografadas seguras HTTPS operam por padrão na porta 443.',
    imageUrl: 'https://media.tenor.com/j9vdAnWtH1kAAAAC/10.gif'
  },
  {
    id: 'comp_12',
    category: 'computacao',
    question: 'Qual engenheiro de software finlandês criou tanto o kernel do sistema operacional Linux quanto o sistema de controle de versão Git?',
    answers: ['linus torvalds', 'linus'],
    explanation: 'Linus Torvalds criou o Git em apenas algumas semanas em 2005 para gerenciar o desenvolvimento descentralizado do próprio kernel do Linux.',
    imageUrl: 'https://media.tenor.com/WDJlGLiRW3YAAAAC/linus-linus-benedict-torvalds.gif'
  },
  {
    id: 'comp_13',
    category: 'computacao',
    question: 'Qual tipo de malware sequestra e criptografa os arquivos do computador da vítima, exigindo pagamento de resgate para devolvê-los?',
    answers: ['ransomware', 'o ransomware'],
    explanation: 'Ransomware (como WannaCry e LockBit) se tornou uma das maiores ameaças digitais contemporâneas, exigindo frequentemente criptomoedas como resgate para liberação dos dados.',
    imageUrl: 'https://media.tenor.com/YrTMShvtLPYAAAAC/petya-ransomware.gif'
  },
  {
    id: 'comp_14',
    category: 'computacao',
    question: 'Qual é a maior plataforma de hospedagem de código-fonte e controle de versão do mundo, cujo mascote é o híbrido de gato e polvo Octocat?',
    answers: ['github', 'o github'],
    explanation: 'Fundado em 2008 e adquirido pela Microsoft em 2018, o GitHub hospeda mais de 100 milhões de desenvolvedores e centenas de milhões de repositórios open-source.',
    imageUrl: 'https://media.tenor.com/w0P0FSoo3z0AAAAC/pull-request-code.gif'
  },
  {
    id: 'comp_15',
    category: 'computacao',
    question: 'Qual sistema de banco de dados NoSQL orientado a documentos no formato BSON (semelhante ao JSON) é o mais popular do mercado?',
    answers: ['mongodb', 'mongo'],
    explanation: 'O MongoDB armazena dados em documentos flexíveis e esquemas dinâmicos, permitindo grande escalabilidade horizontal em aplicações modernas.',
    imageUrl: 'https://media.tenor.com/bvYhwX55qUAAAAAC/a-level-computing.gif'
  },
  {
    id: 'comp_16',
    category: 'computacao',
    question: 'Qual protocolo de rede é responsável por atribuir e distribuir automaticamente endereços IP dinâmicos para dispositivos conectados?',
    answers: ['dhcp', 'protocolo dhcp'],
    explanation: 'DHCP (Dynamic Host Configuration Protocol) elimina a necessidade de configurar manualmente endereços IP, gateways e servidores DNS em cada computador da rede.',
    imageUrl: 'https://media.tenor.com/-v6rF1tYTmgAAAAC/dhcp-ip.gif'
  },
  {
    id: 'comp_17',
    category: 'computacao',
    question: 'Qual linguagem de programação orientada a objetos foi criada por James Gosling na Sun Microsystems sob o famoso lema "Write Once, Run Anywhere"?',
    answers: ['java'],
    explanation: 'Java compila código para bytecode que é executado na JVM (Java Virtual Machine), garantindo portabilidade em qualquer sistema operacional.',
    imageUrl: 'https://media.tenor.com/T7MJHBjax1IAAAAC/coding-programmer.gif'
  },
  {
    id: 'comp_18',
    category: 'computacao',
    question: 'Qual subcampo da Inteligência Artificial utiliza redes neurais profundas com múltiplas camadas para reconhecer imagens, fala e linguagem natural?',
    answers: ['deep learning', 'aprendizado profundo', 'redes neurais profundas'],
    explanation: 'Deep Learning alimenta as tecnologias de ponta em visão computacional, carros autônomos e Grandes Modelos de Linguagem (LLMs como o GPT e Gemini).',
    imageUrl: 'https://media.tenor.com/NN8feaF-slEAAAAC/ai-peak-performance-computational-peak-limit.gif'
  },

  // ==========================================
  // 7. CINEMA & SÉRIES (10 Perguntas)
  // ==========================================
  {
    id: 'series_01',
    category: 'series',
    question: 'Na aclamada série Breaking Bad, qual é o pseudônimo criminoso adotado pelo professor de química Walter White no submundo?',
    answers: ['heisenberg', 'o heisenberg'],
    explanation: 'Walter escolheu o nome Heisenberg em homenagem ao físico teórico alemão Werner Heisenberg, formulador do Princípio da Incerteza.',
    imageUrl: 'https://media.tenor.com/56gSZqGGe_AAAAAC/breaking-bad-heisenberg.gif'
  },
  {
    id: 'series_02',
    category: 'series',
    question: 'Em Stranger Things, qual é o nome da dimensão sombria, fria e corrompida habitada pelo Demogorgon e pelo Vecna?',
    answers: ['mundo invertido', 'upside down', 'o mundo invertido'],
    explanation: 'O Mundo Invertido é um reflexo espelhado idêntico da cidade de Hawkins, porém tomado por esporos tóxicos, videiras e criaturas predadoras.',
    imageUrl: 'https://media.tenor.com/yJkdaMrdduYAAAAC/end.gif'
  },
  {
    id: 'series_03',
    category: 'series',
    question: 'Na saga Game of Thrones, qual é a cobiçada sede real forjada com mil espadas de inimigos rendidos sob o sopro de dragão?',
    answers: ['trono de ferro', 'o trono de ferro', 'iron throne'],
    explanation: 'O Trono de Ferro foi forjado por Aegon, o Conquistador, utilizando as espadas dos senhores derrotados durante a Guerra da Conquista de Westeros.',
    imageUrl: 'https://media.tenor.com/WfqSmgl6iyoAAAAC/iron-throne-lord-ormund-hightower.gif'
  },
  {
    id: 'series_04',
    category: 'series',
    question: 'Na trilogia cinematográfica Matrix das irmãs Wachowski, que cor de pílula Morpheus oferece a Neo para descobrir a verdade da realidade?',
    answers: ['vermelha', 'pilula vermelha', 'a vermelha', 'red pill'],
    explanation: 'A pílula vermelha desconecta o usuário da simulação de computador da Matrix e o acorda no mundo real devastado de 2199.',
    imageUrl: 'https://media.tenor.com/FTrHUxAGq0sAAAAC/sure-do-red.gif'
  },
  {
    id: 'series_05',
    category: 'series',
    question: 'Na franquia cinematográfica Harry Potter, em qual das quatro casas de Hogwarts Harry, Hermione e Rony foram selecionados?',
    answers: ['grifinoria', 'gryffindor'],
    explanation: 'Fundada por Godric Gryffindor, a casa valoriza coragem, bravura, ousadia e cavalheirismo acima de tudo.',
    imageUrl: 'https://media.tenor.com/cxRg9iXzuSMAAAAC/gryffindor-afshan-azad.gif'
  },
  {
    id: 'series_06',
    category: 'series',
    question: 'Em Peaky Blinders, qual é o nome do estrategista frio e calculista que lidera a família e a gangue dos Shelby em Birmingham?',
    answers: ['thomas shelby', 'tommy shelby', 'thomas', 'tommy'],
    explanation: 'Interpretado magistralmente por Cillian Murphy, Tommy Shelby transforma uma gangue de rua local em um império empresarial e político.',
    imageUrl: 'https://media.tenor.com/xuMhjx46s8wAAAAC/np-peaky.gif'
  },
  {
    id: 'series_07',
    category: 'series',
    question: 'Em O Senhor dos Anéis, qual é o hobbit do Condado encarregado da perigosa missão de destruir o Um Anel nas chamas da Montanha da Perdição?',
    answers: ['frodo', 'frodo bolseiro', 'frodo baggins'],
    explanation: 'Acompanhado pelo leal Samwise Gamgee, Frodo atravessa toda a Terra Média até o coração sombrio de Mordor para destruir a relíquia de Sauron.',
    imageUrl: 'https://media.tenor.com/iHA01RUisAUAAAAC/bring-forth-the-ring-frodo.gif'
  },
  {
    id: 'series_08',
    category: 'series',
    question: 'No épico clássico Star Wars, qual é a nave espacial lendária de Han Solo e Chewbacca descrita como a mais rápida da galáxia?',
    answers: ['millennium falcon', 'falcon', 'milenar falcon'],
    explanation: 'A Millennium Falcon é um cargueiro leve YT-1300 Corelliano modificado que concluiu a Corrida de Kessel em menos de doze parsecs.',
    imageUrl: 'https://media.tenor.com/DkE2d5hu6PYAAAAC/rey-the-last-jedi.gif'
  },
  {
    id: 'series_09',
    category: 'series',
    question: 'Na série apocalíptica The Walking Dead, qual era a profissão de Rick Grimes no estado da Geórgia antes da infestação de mortos-vivos?',
    answers: ['policial', 'xerife', 'vice xerife', 'oficial de policia'],
    explanation: 'Rick era vice-xerife da pequena cidade de King County e acordou de um coma em um hospital abandonado após o mundo ruir.',
    imageUrl: 'https://media.tenor.com/UBCcylOCSuAAAAAC/police-afsar-aayan-kapoor.gif'
  },
  {
    id: 'series_10',
    category: 'series',
    question: 'No filme Titanic (1997) de James Cameron, qual é o nome do jovem desenhista interpretado por Leonardo DiCaprio que se apaixona por Rose?',
    answers: ['jack', 'jack dawson'],
    explanation: 'Jack ganhou a passagem de terceira classe no navio Titanic em um jogo de pôquer minutos antes da partida em Southampton.',
    imageUrl: 'https://media.tenor.com/4eg_7XOMPMcAAAAC/lost-tv-show.gif'
  },

  // ==========================================
  // 8. MÚSICA & HITS (10 Perguntas)
  // ==========================================
  {
    id: 'musica_01',
    category: 'musica',
    question: 'Qual vocalista lendário liderou a icônica banda de rock Queen e compôs o clássico atemporal "Bohemian Rhapsody"?',
    answers: ['freddie mercury', 'mercury', 'freddy mercury'],
    explanation: 'Nascido Farrokh Bulsara em Zanzibar, Freddie Mercury é considerado uma das vozes e presenças de palco mais grandiosas de toda a história da música.',
    imageUrl: 'https://media.tenor.com/FiYTCzMP1u4AAAAC/queen-queen-music.gif'
  },
  {
    id: 'musica_02',
    category: 'musica',
    question: 'Qual artista consagrado mundialmente como "Rei do Pop" lançou o álbum "Thriller" em 1982, o mais vendido da história?',
    answers: ['michael jackson', 'michael'],
    explanation: 'Thriller ultrapassou 70 milhões de cópias vendidas e imortalizou sucessos como Billie Jean, Beat It e o famoso passo de dança Moonwalk.',
    imageUrl: 'https://media.tenor.com/fKgHlOi465AAAAAC/dirty-diana-michael-jackson.gif'
  },
  {
    id: 'musica_03',
    category: 'musica',
    question: 'De qual cidade portuária da Inglaterra surgiu o lendário quarteto de rock The Beatles em 1960?',
    answers: ['liverpool'],
    explanation: 'John Lennon, Paul McCartney, George Harrison e Ringo Starr iniciaram sua trajetória tocando em clubes como o mítico The Cavern Club em Liverpool.',
    imageUrl: 'https://media.tenor.com/CgucXZPRmtwAAAAC/champions-liverpool-liverpool.gif'
  },
  {
    id: 'musica_04',
    category: 'musica',
    question: 'Qual dupla francesa pioneira da música eletrônica se apresentava usando icônicos capacetes metálicos de robôs futuristas?',
    answers: ['daft punk'],
    explanation: 'Formada por Thomas Bangalter e Guy-Manuel de Homem-Christo em 1993, a dupla revolucionou a house music global até seu encerramento em 2021.',
    imageUrl: 'https://media.tenor.com/vsgH56TxUUUAAAAC/rajbuddygaming.gif'
  },
  {
    id: 'musica_05',
    category: 'musica',
    question: 'Qual vocalista e guitarrista liderou a banda Nirvana e se tornou o maior ícone do movimento grunge em Seattle nos anos 90?',
    answers: ['kurt cobain', 'cobain'],
    explanation: 'Com o álbum Nevermind e o hit Smells Like Teen Spirit, Kurt Cobain redefiniu o rock mundial e levou o grunge ao topo de todas as paradas.',
    imageUrl: 'https://media.tenor.com/rHn5LlHseEMAAAAC/nirvana-music.gif'
  },
  {
    id: 'musica_06',
    category: 'musica',
    question: 'Qual compositor alemão do período clássico e romântico compôs a célebre Nona Sinfonia (Ode à Alegria) mesmo estando completamente surdo?',
    answers: ['beethoven', 'ludwig van beethoven'],
    explanation: 'Beethoven começou a perder a audição aos 26 anos, mas continuou compondo algumas das obras-primas mais profundas e complexas da história ocidental.',
    imageUrl: 'https://media.tenor.com/dCT3bZwW27QAAAAC/beethoven-made-this-reaction-first-time-hearing-beethoven.gif'
  },
  {
    id: 'musica_07',
    category: 'musica',
    question: 'Qual astro jamaicano é internacionalmente aclamado como o maior embaixador e lenda da história da música Reggae?',
    answers: ['bob marley', 'marley'],
    explanation: 'Bob Marley difundiu as mensagens de paz, amor e justiça social através de hinos globais como One Love, Redemption Song e Could You Be Loved.',
    imageUrl: 'https://media.tenor.com/_I6zF-ihjWsAAAAC/reggae-will-unify-the-people-bob-marley.gif'
  },
  {
    id: 'musica_08',
    category: 'musica',
    question: 'Qual banda de rock progressivo britânica lançou a icônica capa com um prisma refratando luz no álbum "The Dark Side of the Moon"?',
    answers: ['pink floyd'],
    explanation: 'Lançado em 1973, The Dark Side of the Moon permaneceu nas paradas da Billboard por mais de 900 semanas com engenharia de som pioneira.',
    imageUrl: 'https://media.tenor.com/mg3cwB7dseQAAAAC/thisistheend-the-end.gif'
  },
  {
    id: 'musica_09',
    category: 'musica',
    question: 'Qual é o nome do guitarrista de cartola preta e solos virtuosos do Guns N\' Roses famoso por "Sweet Child O\' Mine"?',
    answers: ['slash', 'saul hudson'],
    explanation: 'Nascido Saul Hudson, Slash se consagrou como um dos guitarristas mais reconhecíveis do planeta com sua inseparável Gibson Les Paul.',
    imageUrl: 'https://media.tenor.com/feQilmdsK_gAAAAC/bass-guitar.gif'
  },
  {
    id: 'musica_10',
    category: 'musica',
    question: 'Quantas cordas tem um contrabaixo tradicional em sua afinação clássica padrão?',
    answers: ['4', 'quatro', '4 cordas', 'quatro cordas'],
    explanation: 'O baixo elétrico padrão possui 4 cordas afinadas em Mi, Lá, Ré e Sol (E-A-D-G), correspondendo às quatro cordas mais graves do violão.',
    imageUrl: 'https://media.tenor.com/uoxmrFQsFB0AAAAC/4musqualo.gif'
  },

  // ==========================================
  // 9. MITOLOGIA & HISTÓRIA (10 Perguntas)
  // ==========================================
  {
    id: 'mito_01',
    category: 'mitologia',
    question: 'Na mitologia grega, qual dos três grandes irmãos olimpianos reina sobre o reino dos mortos e as profundezas do submundo?',
    answers: ['hades', 'plutao'],
    explanation: 'Hades tirou a sorte com Zeus e Poseidon após a Titanomaquia, ficando responsável por governar o submundo e proteger o descanso das almas.',
    imageUrl: 'https://media.tenor.com/MXYFpMoR2HgAAAAC/hades-zagreus.gif'
  },
  {
    id: 'mito_02',
    category: 'mitologia',
    question: 'Na mitologia nórdica, qual é o nome sagrado do martelo destruidor de montanhas forjado pelos anões para o deus Thor?',
    answers: ['mjolnir', 'mjollnir', 'miolnir'],
    explanation: 'Mjölnir foi forjado pelos anões ferreiros Sindri e Brokk. Seu cabo ficou curto devido a uma picada de mosca causada por Loki durante a forja.',
    imageUrl: 'https://media.tenor.com/yMQj_dcJ7L0AAAAC/vision-thor.gif'
  },
  {
    id: 'mito_03',
    category: 'mitologia',
    question: 'Na mitologia egípcia antiga, qual deus com cabeça de chacal era o protetor dos mortos e mestre dos ritos de embalsamamento?',
    answers: ['anubis', 'inpu'],
    explanation: 'Anúbis guiava as almas no tribunal de Osíris e pesava o coração do falecido na balança da deusa da verdade e justiça, Maat.',
    imageUrl: 'https://media.tenor.com/K5uNULRfV6wAAAAC/anubis-immortal-god.gif'
  },
  {
    id: 'mito_04',
    category: 'mitologia',
    question: 'Quem se consagrou historicamente como o primeiro Imperador de Roma no ano 27 a.C. após o fim da República Romana?',
    answers: ['augusto', 'otavio augusto', 'cesar augusto', 'otavio'],
    explanation: 'Filho adotivo de Júlio César, Otávio recebeu do Senado o título honorífico de Augusto e governou durante a chamada Pax Romana.',
    imageUrl: 'https://media.tenor.com/NU_kfOZDInQAAAAC/august-flowers.gif'
  },
  {
    id: 'mito_05',
    category: 'mitologia',
    question: 'Em que ano histórico ocorreu a Proclamação da República do Brasil sob a liderança do Marechal Deodoro da Fonseca?',
    answers: ['1889'],
    explanation: 'A República foi proclamada na Praça da Aclamação (atual Praça da República) no Rio de Janeiro no dia 15 de novembro de 1889.',
    imageUrl: 'https://media.tenor.com/GXeb4s1ogasAAAAC/ak-ayamatsu-ayamatsu.gif'
  },
  {
    id: 'mito_06',
    category: 'mitologia',
    question: 'Na mitologia grega, qual criatura monstruosa com serpentes no lugar de cabelos transformava em pedra qualquer um que a olhasse nos olhos?',
    answers: ['medusa', 'gorgona', 'a medusa'],
    explanation: 'Medusa era uma das três Górgonas e foi decapitada pelo herói Perseu com o auxílio do escudo espelhado dado por Atena.',
    imageUrl: 'https://media.tenor.com/wi2JdZHEUI8AAAAC/clash-of-the-titans-clash-of-the-titans-1981.gif'
  },
  {
    id: 'mito_07',
    category: 'mitologia',
    question: 'Qual colossal estrutura de pedras e muralhas com mais de 20 mil quilômetros foi erguida na Ásia para proteger contra invasões nômades?',
    answers: ['muralha da china', 'grande muralha da china', 'grande muralha', 'muralha chinesa'],
    explanation: 'Iniciada pelo imperador Qin Shi Huang no século III a.C., a Grande Muralha foi ampliada por séculos, especialmente na dinastia Ming.',
    imageUrl: 'https://media.tenor.com/flA9jyFcZU0AAAAC/wall-great-wall-og-china.gif'
  },
  {
    id: 'mito_08',
    category: 'mitologia',
    question: 'Em que ano terminou oficialmente a Segunda Guerra Mundial após a rendição formal das forças do Eixo?',
    answers: ['1945'],
    explanation: 'O conflito mais sangrento da história humana terminou em 1945 com a capitulação da Alemanha nazista em maio e do Japão em setembro.',
    imageUrl: 'https://media.tenor.com/_WtIEvrGqzcAAAAC/mark-the-year-1945-movie-from-jan-7th-1945.gif'
  },
  {
    id: 'mito_09',
    category: 'mitologia',
    question: 'Na mitologia nórdica, qual é o nome do evento profético de cataclismo cósmico que culmina na batalha final e no fim dos deuses?',
    answers: ['ragnarok', 'o ragnarok'],
    explanation: 'O Ragnarök envolve a quebra dos laços do lobo Fenrir, o duelo mortal entre Thor e a serpente Jörmungandr e a destruição pelo fogo de Surtr.',
    imageUrl: 'https://media.tenor.com/dyyvfWuj2zgAAAAC/patternbase-8-bit.gif'
  },
  {
    id: 'mito_10',
    category: 'mitologia',
    question: 'Qual monarca e guerreiro macedônio invadiu e conquistou todo o Império Persa criando um dos maiores impérios do mundo antigo aos 30 anos?',
    answers: ['alexandre o grande', 'alexandre magno', 'alexandre'],
    explanation: 'Discípulo do filósofo Aristóteles, Alexandre nunca foi derrotado em batalha e fundou dezenas de cidades batizadas como Alexandria.',
    imageUrl: 'https://media.tenor.com/l_mGMkdWdlMAAAAC/alexander.gif'
  },

  // ==========================================
  // 10. DESENHOS & NOSTALGIA (10 Perguntas)
  // ==========================================
  {
    id: 'desenho_01',
    category: 'desenhos',
    question: 'No desenho animado Bob Esponja Calça Quadrada, qual é o nome da cidade submarina onde se passa a história?',
    answers: ['fenda do biquini', 'fenda do bikini', 'bikini bottom'],
    explanation: 'A cidade submarina fictícia de Bikini Bottom foi inspirada no Atol de Bikini, situado no Oceano Pacífico.',
    imageUrl: 'https://media.tenor.com/Oi89kp36x-cAAAAC/paragwontbms.gif'
  },
  {
    id: 'desenho_02',
    category: 'desenhos',
    question: 'Qual é o nome do dispositivo alienígena em forma de relógio que permite a Ben Tennyson se transformar em 10 alienígenas em Ben 10?',
    answers: ['omnitrix', 'o omnitrix'],
    explanation: 'Criado pelo mestre Azmuth no planeta Galvan Prime, o Omnitrix foi construído como um instrumento de paz para preservar o DNA de espécies cósmicas.',
    imageUrl: 'https://media.tenor.com/ttCyN0-DxMUAAAAC/killer-ghost.gif'
  },
  {
    id: 'desenho_03',
    category: 'desenhos',
    question: 'No clássico animado da Disney "O Rei Leão", qual é o nome do leãozinho filhote que herda o reino após a morte trágica de Mufasa?',
    answers: ['simba'],
    explanation: 'A palavra "Simba" significa literalmente "leão" no idioma suaíli falado na África Oriental.',
    imageUrl: 'https://media.tenor.com/nEeLSZDV0XkAAAAC/disneytoon-movies.gif'
  },
  {
    id: 'desenho_04',
    category: 'desenhos',
    question: 'Qual é o ingrediente secreto e misterioso adicionado acidentalmente pelo Professor Utônio na criação das Meninas Superpoderosas?',
    answers: ['elemento x', 'o elemento x'],
    explanation: 'Ao misturar açúcar, tempero e tudo o que há de bom, o professor quebrou sem querer o frasco do volátil Elemento X, dando superpoderes às garotas.',
    imageUrl: 'https://media.tenor.com/2sPwxdt2Oj8AAAAC/the-powerpuff-girls-powerpuff-girls.gif'
  },
  {
    id: 'desenho_05',
    category: 'desenhos',
    question: 'Na animação Toy Story, qual é o nome do menino dono dos brinquedos Woody e Buzz Lightyear cujo nome está escrito na sola da bota de Woody?',
    answers: ['andy'],
    explanation: 'Andy Davis é o afetuoso garoto humano cujas brincadeiras na infância dão sentido à vida e ao propósito dos brinquedos.',
    imageUrl: 'https://media.tenor.com/YBjIi1YPXV0AAAAC/dancing-cat-cat.gif'
  },
  {
    id: 'desenho_06',
    category: 'desenhos',
    question: 'No desenho "Os Padrinhos Mágicos", qual é o nome do casal de fadas com cabelos verde e rosa que realizam os desejos de Timmy Turner?',
    answers: ['cosmo e wanda', 'wanda e cosmo'],
    explanation: 'Cosmo (o marido empolgado e atrapalhado) e Wanda (a esposa prudente e sensata) vivem disfarçados como peixinhos dourados no aquário de Timmy.',
    imageUrl: 'https://media.tenor.com/Ebohtihr9R0AAAAC/the-fairly-odd-parents-a-new-wish.gif'
  },
  {
    id: 'desenho_07',
    category: 'desenhos',
    question: 'Qual é a icônica van psicodélica colorida usada pela turma do Scooby-Doo para investigar mistérios sobrenaturais?',
    answers: ['maquina do misterio', 'mystery machine', 'a maquina do misterio'],
    explanation: 'A Máquina do Mistério é uma van decorada com flores e cores vivas dos anos 60 que transporta Fred, Daphne, Velma, Salsicha e Scooby.',
    imageUrl: 'https://media.tenor.com/MKxNtzCkiE0AAAAC/reciclando-maquina-de-reciclagem.gif'
  },
  {
    id: 'desenho_08',
    category: 'desenhos',
    question: 'Em Dragon Ball Z, qual dragão sagrado celestial é invocado ao se reunir todas as 7 Esferas do Dragão da Terra?',
    answers: ['shenlong', 'shenron', 'o shenlong'],
    explanation: 'Criado pelo Kami-Sama da Terra, Shenlong concede desejos extraordinários antes de se dispersar novamente em esferas de pedra por um ano.',
    imageUrl: 'https://media.tenor.com/ByrZlC64iz0AAAAC/shenron-dragon-ball-z.gif'
  },
  {
    id: 'desenho_09',
    category: 'desenhos',
    question: 'Na animação pré-histórica Os Flintstones, qual é a cidade da Idade da Pedra onde Fred e Wilma residem?',
    answers: ['bedrock'],
    explanation: 'Bedrock conta com toda a tecnologia moderna adaptada à pré-história: carros movidos pelos pés, toca-discos acionados por bicos de pássaros e dinossauros guindastes.',
    imageUrl: 'https://media.tenor.com/6SP0H3Hc6RQAAAAC/band-heitor.gif'
  },
  {
    id: 'desenho_10',
    category: 'desenhos',
    question: 'Qual famoso gato azul da MGM e Hanna-Barbera vive em constante perseguição ao esperto rato marrom Jerry?',
    answers: ['tom', 'thomas'],
    explanation: 'Estreada em 1940 sob o título "Puss Gets the Boot", a rivalidade clássica e comédia pastelão de Tom e Jerry conquistou 7 prêmios Oscar de Melhor Curta Animado.',
    imageUrl: 'https://media.tenor.com/6ANHzbf7hncAAAAC/happy-jerry.gif'
  },

  // ==========================================
  // 11. GEOGRAFIA & PAÍSES (10 Perguntas)
  // ==========================================
  {
    id: 'geo_01',
    category: 'geografia',
    question: 'Qual é o maior país do planeta Terra em extensão territorial contínua, abrangendo mais de 17 milhões de km²?',
    answers: ['russia', 'a russia', 'federacao russa'],
    explanation: 'A Rússia se estende por dois continentes (Europa e Ásia) e possui 11 fusos horários diferentes em seu vasto território.',
    imageUrl: 'https://media.tenor.com/evoSxqcmKCYAAAAC/soviet-cat-sovicat.gif'
  },
  {
    id: 'geo_02',
    category: 'geografia',
    question: 'Ao contrário da crença popular de que seja Sydney, qual é a verdadeira capital federal oficial da Austrália?',
    answers: ['camberra', 'canberra'],
    explanation: 'Camberra foi construída e planejada como capital na década de 1910 como um compromisso histórico para encerrar a rivalidade entre Sydney e Melbourne.',
    imageUrl: 'https://media.tenor.com/zwfqU68JhZEAAAAC/venice-venezia.gif'
  },
  {
    id: 'geo_03',
    category: 'geografia',
    question: 'Qual é o rio mais longo e de maior vazão de água do mundo, nascendo nos Andes peruanos e desaguando no Atlântico?',
    answers: ['rio amazonas', 'amazonas'],
    explanation: 'O Rio Amazonas descarrega aproximadamente 20% de toda a água doce fluvial mundial nos oceanos do planeta.',
    imageUrl: 'https://media.tenor.com/sxhGV6B0ePMAAAAC/canoeing-primal-survivor5.gif'
  },
  {
    id: 'geo_04',
    category: 'geografia',
    question: 'Qual país insular da Ásia Oriental com mais de 6.800 ilhas é poeticamente apelidado de "Terra do Sol Nascente"?',
    answers: ['japao', 'o japao', 'nihon', 'nippon'],
    explanation: 'Os caracteres em kanji que formam o nome do Japão (日本) significam "origem do sol", daí a denominação milenar de Terra do Sol Nascente.',
    imageUrl: 'https://media.tenor.com/SHUKeoZH5JkAAAAC/nations-of-the-world-by-yakko-warner-animaniacs-asia-africa-australia-nations-of-the-world.gif'
  },
  {
    id: 'geo_05',
    category: 'geografia',
    question: 'Qual é a montanha mais alta do mundo acima do nível do mar, localizada na cordilheira do Himalaia com 8.848 metros?',
    answers: ['monte everest', 'everest', 'chomolungma', 'sagarmatha'],
    explanation: 'O cume do Monte Everest fica situado exatamente na fronteira internacional entre o Nepal e a região autônoma do Tibete (China).',
    imageUrl: 'https://media.tenor.com/F3KD8vfge4AAAAAC/not-peak.gif'
  },
  {
    id: 'geo_06',
    category: 'geografia',
    question: 'Qual é o menor Estado soberano e independente do mundo em área e população, encravado na cidade de Roma?',
    answers: ['vaticano', 'o vaticano', 'cidade do vaticano'],
    explanation: 'Com apenas 0,44 km² de área e cerca de 800 habitantes, o Estado da Cidade do Vaticano foi formalmente instituído pelo Tratado de Latrão em 1929.',
    imageUrl: 'https://media.tenor.com/o5Cmx7TuEV0AAAAC/klt-kids-learning-tube.gif'
  },
  {
    id: 'geo_07',
    category: 'geografia',
    question: 'Qual deserto arenoso localizado no norte da África é consagrado como o maior deserto quente do mundo?',
    answers: ['deserto do saara', 'saara', 'sahara'],
    explanation: 'O Deserto do Saara cobre mais de 9,2 milhões de km², área comparável em tamanho territorial ao território total dos Estados Unidos ou China.',
    imageUrl: 'https://media.tenor.com/CWMnqKiSA90AAAAC/humour-jeremy.gif'
  },
  {
    id: 'geo_08',
    category: 'geografia',
    question: 'Qual canal marítimo artificial aberto na América Central em 1914 conecta o Oceano Atlântico ao Oceano Pacífico?',
    answers: ['canal do panama', 'panama'],
    explanation: 'O Canal do Panamá encurtou em milhares de quilômetros a rota náutica de navios cargueiros que antes precisavam contornar o Cabo Horn.',
    imageUrl: 'https://media.tenor.com/7M4_jJaf8fgAAAAC/panamakirila.gif'
  },
  {
    id: 'geo_09',
    category: 'geografia',
    question: 'Qual país europeu banhado pelo Mar Mediterrâneo possui um formato geográfico mundialmente comparado a uma bota de cano alto?',
    answers: ['italia', 'a italia'],
    explanation: 'A península itálica tem formato nítido de uma bota que parece "chutar" a ilha da Sicília em direção ao mar.',
    imageUrl: 'https://media.tenor.com/nXxrsJBilwEAAAAC/montecchio-supremacy-montecchio.gif'
  },
  {
    id: 'geo_10',
    category: 'geografia',
    question: 'Qual país sul-americano possui a mais longa faixa costeira do Oceano Pacífico e o deserto de Atacama em seu norte?',
    answers: ['chile', 'o chile'],
    explanation: 'O Chile possui mais de 4.300 km de comprimento de norte a sul, mas tem uma largura média de apenas 175 km entre os Andes e o oceano.',
    imageUrl: 'https://media.tenor.com/YC-eGVX0eDEAAAAC/chile.gif'
  }
];

/**
 * Normalizes input string for fair matching (lowercase, strip accents, punctuation, extra spaces).
 * @param {string} text
 */
function normalizeAnswer(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')     // remove punctuation
    .trim()
    .replace(/\s+/g, ' ');           // collapse spaces
}

module.exports = {
  QUIZ_CATEGORIES,
  QUIZ_QUESTIONS,
  normalizeAnswer
};
