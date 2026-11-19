import type { Messages } from "./en";

export const ja: Messages = {
  "meta.description":
    "furzr は音楽の世界を探検する新しい方法です。アーティストやバンドのつながりをたどり、試聴しながら、木の枝のように音楽の知識を広げましょう。",
  "map.label": "似ているアーティストのマップ",

  "lang.label": "言語",

  "form.add": "追加",
  "sound.mute": "ミュート",
  "sound.unmute": "ミュート解除",
  "sound.off": "サウンドオフ",
  "sound.none": "試聴できる曲がありません",
  "sound.unavailable": "試聴サービスを利用できません",

  "mode.label": "マップのモード",
  "mode.title": "マップでつなぐもの",
  "mode.similar": "似ている",
  "mode.influences": "影響",
  "mode.movies": "映画",
  "play.label": "探索またはゲーム",
  "play.explore": "探索",
  "play.game": "ゲーム",
  "mode.confirmSwitch": "モードを切り替えると現在のマップが消去されます。続けますか？",
  "confirm.continue": "続ける",
  "confirm.cancel": "キャンセル",

  "input.label": "アーティスト名",
  "input.artist": "アーティスト名を入力",
  "input.movie": "映画のタイトルを入力",
  "suggestions.label": "候補",
  "suggestions.fans": "ファン {n} 人",

  "about.title": "このアプリについて",
  "about.introHtml":
    "<b>furzr</b> は音楽の世界を探検するユニークな方法です。アーティストやバンドのつながりをたどり、試聴しましょう。木の枝のように音楽の知識を広げ、次に聴く音楽を見つけてください。",
  "about.howto":
    "アーティスト名を入力し、名前をクリックしてマップを広げます。名前はドラッグでき、スクロールやピンチでズームできます。",
  "about.growthHtml":
    "<b>スネーク</b>はたどった道だけを残し、未探索の名前はステップごとに消えます。<b>ツリー</b>は何も消さず、マップは無限に広がります。",
  "about.modesHtml":
    "モードは 3 つ：<b>似ている</b>アーティスト、<b>影響</b>（そのアーティストに影響を与えた人と、影響を受けた人）、利用できる場合は<b>映画</b>（おすすめの映画）。",
  "about.gameHtml":
    "<b>ゲーム</b>：かけ離れた有名アーティスト 2 組を、できるだけ短いスネークでつなぎましょう。各チャレンジには難易度（かんたん〜エクストリーム）があり、目標クリック数と獲得できる得点が決まります。目標以内なら 1000〜4000 点、それを超えると 1 クリックごとに 20% 減ります。",
  "about.creditsHtml":
    "<b>furzr</b> は {lastfm}、{wikidata}、{tmdb} のデータと {deezer} の試聴音源を利用しています。この製品は TMDB API を使用していますが、TMDB による承認・認定を受けたものではありません。",
  "legend.input": "入力したアーティスト",
  "legend.exploded": "探索済み",
  "legend.similar": "似ている",
  "legend.target": "ゴール（ゲーム）",

  "share.tab": "このマップを共有",
  "panel.close": "閉じる",
  "share.copy": "リンクをコピー",
  "share.native": "共有…",
  "share.urlLabel": "このマップへのリンク",
  "share.copied": "リンクをコピーしました！開いた人にこのマップが表示されます。",
  "share.copyManually": "このリンクをコピーしてマップを共有してください。",
  "share.invalid": "この共有マップのリンクは無効です",
  "share.unavailable": "この共有マップには、ここでは利用できないデータソースが必要です",

  "map.description": "このマップは {a} から {b} へのつながりを示しています",
  "map.empty.similar": "アーティストマップを広げましょう",
  "map.empty.influences": "影響マップを広げましょう",
  "map.empty.movies": "映画マップを広げましょう",
  "map.empty.game": "2 組のアーティストをつなぎましょう",

  "notFound.similar": "その名前のアーティストは見つかりません。別の名前をお試しください",
  "notFound.influences": "このアーティストは Wikidata に登録されていません。別の名前をお試しください",
  "notFound.movies": "そのタイトルの映画は見つかりません。別のタイトルをお試しください",
  "noNeighbors.similar": "このアーティストには似ているアーティストがいません",
  "noNeighbors.influences": "Wikidata にはこのアーティストの影響関係が登録されていません",
  "noNeighbors.movies": "この映画のおすすめはありません",
  "notFound.game": "その名前のアーティストは見つかりません。別の名前をお試しください",
  "noNeighbors.game": "このアーティストには似ているアーティストがいません",

  "game.new": "新しいお題",
  "game.loading": "かけ離れたアーティストを探しています…",
  "game.goal": "{a} と {b} をつなぐ",
  "game.start": "似ているアーティストをクリックして {a} と {b} をつなぎましょう。クリックが少ないほど高得点！",
  "game.moves": "クリック：{n}",
  "game.score": "得点：{score}",
  "game.difficulty": "難易度：{level}",
  "difficulty.1": "かんたん",
  "difficulty.2": "ふつう",
  "difficulty.3": "むずかしい",
  "difficulty.4": "エクストリーム",
  "game.record": "自己ベスト更新！",
  "game.result": "結果",
  "game.failed": "お題が見つかりませんでした。もう一度お試しください",
  "game.shareGoal": "furzr のお題：{a} と {b} をできるだけ少ないクリックでつなごう",
  "game.shareWon": "furzr で {a} と {b} をつなぎました。クリック：{n}、得点：{score}。あなたはもっとうまくできる？",

  "victory.title": "おめでとう！",
  "victory.perfect": "パーフェクト！",
  "victory.subtitle": "{a} と {b} をつなぎました",
  "victory.path": "あなたのルート",
  "victory.score": "得点",
  "victory.clicks": "クリック",
  "victory.difficulty": "難易度",
  "victory.par": "目標：{n} クリック",
  "victory.best": "ベスト",
  "victory.share": "共有",
  "victory.viewMap": "マップを見る",
  "victory.copied": "リンクをコピーしました！友だちに送って挑戦してもらいましょう。",
  "tip.loading": "読み込み中…",

  "help.clickArtist": "アーティストをクリックしてマップを広げましょう",
  "help.clickMovie": "映画をクリックしてマップを広げましょう",
  "help.share": "楽しんで、マップを共有しましょう！",

  "growth.label": "マップの広がり方",
  "growth.snake": "スネーク",
  "growth.tree": "ツリー",
  "growth.snakeTitle": "未探索の名前はステップごとに消え、たどった道だけが残ります",
  "growth.treeTitle": "何も消えず、マップは広がり続けます",
  "growth.toSnake": "スネーク：次のクリックで未探索の名前が消えます",
  "growth.toTree": "ツリー：これからはマップから何も消えません",
  "clear": "マップを消去",

  "overview.about": "{name} について",
  "overview.readMore": "{source} で続きを読む",

  "error.service": "サービスが一時的に利用できません。しばらくしてから再度お試しください",
  "error.generic": "問題が発生しました。もう一度お試しください",
};
