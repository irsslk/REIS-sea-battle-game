import { Locale } from "@/lib/i18n";

type LandingMessages = {
  badge: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  friendCta: string;
  socialProof: string;
  stats: {
    title: string;
    value: string;
  }[];
  featuresTitle: string;
  features: {
    title: string;
    text: string;
  }[];
  proTitle: string;
  proText: string;
  proCta: string;
};

type Messages = {
  navPlay: string;
  navGame: string;
  landing: LandingMessages;
};

export const messages: Record<Locale, Messages> = {
  en: {
    navPlay: "Play now",
    navGame: "Game",
    landing: {
      badge: "Kazakhstan-first strategy hit",
      title: "REIS is the modern Sea Battle for a new generation",
      subtitle:
        "Compete with friends, train against smart bots, and climb from your city to the CIS leaderboard with an AI Coach that sharpens your decisions.",
      primaryCta: "Play now",
      secondaryCta: "Open Arena",
      friendCta: "Play with a friend",
      socialProof: "Built for mobile-first gameplay in CIS and Asia",
      stats: [
        { title: "Match length", value: "4-7 min" },
        { title: "Skill levels", value: "3 bot tiers" },
        { title: "Target modes", value: "Solo + Multiplayer" },
      ],
      featuresTitle: "Why players will stay",
      features: [
        {
          title: "AI Coach after every match",
          text: "Heatmaps, shot quality, and practical tactical advice.",
        },
        {
          title: "Shareable invite links",
          text: "Create instant rooms and challenge friends in one tap.",
        },
        {
          title: "Local identity and rank",
          text: "Become a legend of Almaty, Kazakhstan, and CIS.",
        },
      ],
      proTitle: "Upgrade to Pro",
      proText:
        "Unlock premium themes, deeper analytics, and advanced tournament profile customization.",
      proCta: "Upgrade to Pro",
    },
  },
  ru: {
    navPlay: "Играть сейчас",
    navGame: "Арена",
    landing: {
      badge: "Казахстанский фокус, глобальный уровень",
      title: "REIS — современный Морской бой нового поколения",
      subtitle:
        "Сражайся с друзьями, тренируйся против умных ботов и поднимайся от рейтинга своего города до топа СНГ с AI Coach.",
      primaryCta: "Играть сейчас",
      secondaryCta: "Открыть арену",
      friendCta: "Играть с другом",
      socialProof: "Mobile-first продукт для СНГ и Азии",
      stats: [
        { title: "Длительность матча", value: "4-7 мин" },
        { title: "Уровни сложности", value: "3 уровня бота" },
        { title: "Игровые режимы", value: "Соло + Мультиплеер" },
      ],
      featuresTitle: "Почему игроки останутся",
      features: [
        {
          title: "AI Coach после каждой партии",
          text: "Heatmap выстрелов, точность и конкретные тактические советы.",
        },
        {
          title: "Мультиплеер по ссылке",
          text: "Создавай комнату и зови друзей за один тап.",
        },
        {
          title: "Локальный статус и рейтинг",
          text: "Стань легендой Алматы, Казахстана и всего СНГ.",
        },
      ],
      proTitle: "Upgrade to Pro",
      proText:
        "Открой премиум-темы, расширенную аналитику и гибкую настройку профиля для турниров.",
      proCta: "Upgrade to Pro",
    },
  },
  kk: {
    navPlay: "Қазір ойнау",
    navGame: "Арена",
    landing: {
      badge: "Қазақстанға жақын, деңгейі жоғары",
      title: "REIS — жаңа буынға арналған заманауи Теңіз шайқасы",
      subtitle:
        "Достарыңмен ойна, ақылды боттарға қарсы машықтан, және AI Coach көмегімен қалаңнан бастап ТМД рейтингіне дейін көтеріл.",
      primaryCta: "Қазір ойнау",
      secondaryCta: "Аренаны ашу",
      friendCta: "Доспен ойнау",
      socialProof: "ТМД мен Азияға арналған mobile-first ойын",
      stats: [
        { title: "Матч ұзақтығы", value: "4-7 мин" },
        { title: "Қиындық деңгейі", value: "3 бот деңгейі" },
        { title: "Режимдер", value: "Жеке + Мультиплеер" },
      ],
      featuresTitle: "Ойыншыны не ұстап қалады",
      features: [
        {
          title: "Әр матчтан кейін AI Coach",
          text: "Heatmap, дәлдік метрикалары және нақты тактикалық кеңес.",
        },
        {
          title: "Сілтеме арқылы мультиплеер",
          text: "Бөлме ашып, достарыңды бір батырмамен шақыр.",
        },
        {
          title: "Жергілікті рейтинг пен абырой",
          text: "Алматыда, Қазақстанда және ТМД-да аңыз атан.",
        },
      ],
      proTitle: "Upgrade to Pro",
      proText:
        "Премиум тақырыптар, терең аналитика және турнирлік профильді баптау мүмкіндігі.",
      proCta: "Upgrade to Pro",
    },
  },
};
