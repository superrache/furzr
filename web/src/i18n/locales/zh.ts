import type { Messages } from "./en";

export const zh: Messages = {
  "meta.description":
    "furzr 提供探索音乐世界的新方式：浏览艺人与乐队之间的关联并试听片段，让你的音乐知识像树枝一样生长。",
  "map.label": "相似艺人地图",

  "lang.label": "语言",

  "form.add": "添加",
  "sound.toggle": "开启/关闭声音",
  "sound.on": "声音已开启",
  "sound.off": "声音已关闭",
  "sound.none": "没有可试听的歌曲",
  "sound.unavailable": "试听服务不可用",

  "mode.label": "地图模式",
  "mode.title": "地图连接的内容",
  "mode.similar": "相似",
  "mode.influences": "影响",
  "mode.movies": "电影",
  "mode.confirmSwitch": "切换模式会清空当前地图。是否继续？",

  "input.label": "艺人名称",
  "input.artist": "在此输入艺人名称",
  "input.movie": "在此输入电影名称",
  "suggestions.label": "建议",
  "suggestions.fans": "{n} 位粉丝",

  "about.title": "关于本应用",
  "about.introHtml":
    "<b>furzr</b> 提供一种独特的方式来探索音乐世界：浏览艺人与乐队之间的关联并试听片段。让你的音乐知识像树枝一样生长，发现你接下来会听的音乐。",
  "about.howto": "输入一位艺人，然后点击任意名称来扩展地图。可以拖动名称，滚动或双指缩放。",
  "about.growthHtml":
    "<b>蛇形</b>（Crazy Snake）只保留你走过的路径：未探索的名称在每一步都会消失。<b>树形</b>（Huge Tree of Death）不删除任何内容，地图会无限生长。",
  "about.modesHtml":
    "三种模式：<b>相似</b>艺人、<b>影响</b>（谁影响了这位艺人，以及他影响了谁），以及可用时的<b>电影</b>（推荐电影）。",
  "about.creditsHtml":
    "<b>furzr</b> 使用 {lastfm}、{wikidata} 和 {tmdb} 的数据，以及 {deezer} 的试听音频。本产品使用 TMDB API，但未经 TMDB 认可或认证。",
  "legend.input": "你的艺人",
  "legend.exploded": "已探索",
  "legend.similar": "相似",

  "share.tab": "分享此地图",
  "share.copy": "复制链接",
  "share.native": "分享…",
  "share.urlLabel": "此地图的链接",
  "share.copied": "链接已复制！任何人打开它都能看到这张地图。",
  "share.copyManually": "复制此链接即可分享你的地图。",
  "share.invalid": "此共享地图链接无效",
  "share.unavailable": "此共享地图需要的数据来源在这里不可用",

  "map.description": "这张地图展示了如何从 {a} 连接到 {b}",
  "map.empty.similar": "扩展你的艺人地图",
  "map.empty.influences": "扩展你的影响地图",
  "map.empty.movies": "扩展你的电影地图",

  "notFound.similar": "找不到这个名称的艺人，请换一个试试",
  "notFound.influences": "Wikidata 中没有这位艺人，请换一个试试",
  "notFound.movies": "找不到这个名称的电影，请换一个试试",
  "noNeighbors.similar": "这位艺人没有相似艺人",
  "noNeighbors.influences": "Wikidata 中没有这位艺人的影响关系",
  "noNeighbors.movies": "这部电影没有推荐",

  "help.clickArtist": "点击一位艺人来扩展地图",
  "help.clickMovie": "点击一部电影来扩展地图",
  "help.share": "玩得开心，分享你的地图吧！",

  "growth.label": "地图生长方式",
  "growth.snake": "蛇形",
  "growth.tree": "树形",
  "growth.snakeTitle": "Crazy Snake：未探索的名称在每一步都会消失，只留下你的路径",
  "growth.treeTitle": "Huge Tree of Death：不删除任何内容，地图持续生长",
  "growth.toSnake": "蛇形：下次点击时未探索的名称将会消失",
  "growth.toTree": "树形：从现在起，地图上的内容不会再被删除",
  "clear": "清空地图",

  "overview.about": "关于 {name}",
  "overview.readMore": "在 {source} 上阅读更多",

  "error.service": "服务暂时不可用，请稍后重试",
  "error.generic": "出了点问题，请重试",
};
