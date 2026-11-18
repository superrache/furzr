import type { Messages } from "./en";

export const tr: Messages = {
  "meta.description":
    "furzr, müzik dünyasını keşfetmenin yeni bir yolunu sunar: sanatçılar ve gruplar arasındaki bağlantılara göz atın ve kısa parçalar dinleyin. Müzik bilginizi bir ağacın dalları gibi büyütün.",
  "map.label": "Benzer sanatçılar haritası",

  "lang.label": "Dil",

  "form.add": "Ekle",
  "sound.toggle": "Sesi aç/kapat",
  "sound.on": "Ses açık",
  "sound.off": "Ses kapalı",
  "sound.none": "Önizleme parçası yok",
  "sound.unavailable": "Önizleme hizmeti kullanılamıyor",

  "mode.label": "Harita modu",
  "mode.title": "Haritanın neyi bağladığı",
  "mode.similar": "Benzerler",
  "mode.influences": "Etkiler",
  "mode.movies": "Filmler",
  "play.label": "Keşfet veya oyna",
  "play.explore": "Keşfet",
  "play.game": "Oyna",
  "mode.confirmSwitch": "Mod değiştirmek mevcut haritayı siler. Devam edilsin mi?",

  "input.label": "Sanatçı adı",
  "input.artist": "Buraya bir sanatçı adı yazın",
  "input.movie": "Buraya bir film adı yazın",
  "suggestions.label": "Öneriler",
  "suggestions.fans": "{n} hayran",

  "about.title": "Bu uygulama hakkında",
  "about.introHtml":
    "<b>furzr</b>, müzik dünyasını keşfetmenin özgün bir yolunu sunar: sanatçılar ve gruplar arasındaki bağlantılara göz atın ve kısa parçalar dinleyin. Müzik bilginizi bir ağacın dalları gibi büyütün ve yakında ne dinleyeceğinizi keşfedin.",
  "about.howto":
    "Bir sanatçı yazın, ardından haritayı genişletmek için herhangi bir ada tıklayın. Adları sürükleyin, yakınlaştırmak için kaydırın veya iki parmakla sıkıştırın.",
  "about.growthHtml":
    "<b>Yılan</b> (Crazy Snake) yalnızca izlediğiniz yolu tutar: keşfedilmemiş adlar her adımda kaybolur. <b>Ağaç</b> (Huge Tree of Death) hiçbir şeyi silmez ve haritanın sonsuza dek büyümesine izin verir.",
  "about.modesHtml":
    "Üç mod: <b>Benzer</b> sanatçılar, <b>Etkiler</b> (bir sanatçıya kimin ilham verdiği ve onun kime ilham verdiği) ve mevcutsa <b>Filmler</b> (önerilen filmler).",
  "about.gameHtml":
    "<b>Oyun</b>: birbirinden uzak iki tanınmış sanatçıyı mümkün olan en kısa yılanla bağlayın. Her meydan okumanın bir zorluğu (kolaydan aşırıya) vardır; bu, hedef tıklama sayısını ve kazanılacak puanı belirler: hedefte 1000 ile 4000 puan, sonra her fazladan tıklamada %20 daha az.",
  "about.creditsHtml":
    "<b>furzr</b>; {lastfm}, {wikidata} ve {tmdb} verilerini, {deezer} ses önizlemelerini kullanır. Bu ürün TMDB API'sini kullanır ancak TMDB tarafından onaylanmış veya sertifikalandırılmış değildir.",
  "legend.input": "sanatçılarınız",
  "legend.exploded": "keşfedilenler",
  "legend.similar": "benzerler",
  "legend.target": "hedef (oyun)",

  "share.tab": "Bu haritayı paylaş",
  "share.copy": "Bağlantıyı kopyala",
  "share.native": "Paylaş…",
  "share.urlLabel": "Bu haritanın bağlantısı",
  "share.copied": "Bağlantı kopyalandı! Açan herkes bu haritayı görecek.",
  "share.copyManually": "Haritanızı paylaşmak için bu bağlantıyı kopyalayın.",
  "share.invalid": "Bu paylaşılan harita bağlantısı geçersiz",
  "share.unavailable": "Bu paylaşılan harita burada bulunmayan bir veri kaynağı gerektiriyor",

  "map.description": "Bu harita {a} ile {b} arasındaki bağlantıyı gösteriyor",
  "map.empty.similar": "Sanatçı haritanızı genişletin",
  "map.empty.influences": "Etki haritanızı genişletin",
  "map.empty.movies": "Film haritanızı genişletin",
  "map.empty.game": "İki sanatçıyı bağlayın",

  "notFound.similar": "Bu adla bilinen bir sanatçı yok, başka birini deneyin",
  "notFound.influences": "Bu sanatçı Wikidata'da bilinmiyor, başka birini deneyin",
  "notFound.movies": "Bu adla bilinen bir film yok, başka birini deneyin",
  "noNeighbors.similar": "Bu sanatçının benzer sanatçısı yok",
  "noNeighbors.influences": "Wikidata'da bu sanatçı için bilinen bir etki yok",
  "noNeighbors.movies": "Bu film için öneri yok",
  "notFound.game": "Bu adla bilinen bir sanatçı yok, başka birini deneyin",
  "noNeighbors.game": "Bu sanatçının benzer sanatçısı yok",

  "game.new": "Yeni meydan okuma",
  "game.loading": "Birbirinden uzak iki sanatçı aranıyor…",
  "game.goal": "{a} ile {b} arasını bağlayın",
  "game.start": "Benzer sanatçılara tıklayarak {a} ile {b} arasını bağlayın. Ne kadar az tıklama, o kadar yüksek puan!",
  "game.moves": "Tıklama: {n}",
  "game.score": "Puan: {score}",
  "game.difficulty": "Zorluk: {level}",
  "difficulty.1": "Kolay",
  "difficulty.2": "Orta",
  "difficulty.3": "Zor",
  "difficulty.4": "Aşırı",
  "game.record": "Yeni kişisel rekor!",
  "game.failed": "Meydan okuma bulunamadı, lütfen tekrar deneyin",
  "game.shareGoal": "furzr meydan okuması: {a} ile {b} arasını olabildiğince az tıklamayla bağlayın",
  "game.shareWon": "furzr'da {a} ile {b} arasını bağladım. Tıklama: {n}, puan: {score}. Daha iyisini yapabilir misin?",

  "victory.title": "Tebrikler!",
  "victory.perfect": "Mükemmel!",
  "victory.subtitle": "{a} ile {b} arasını bağladınız",
  "victory.path": "Yolunuz",
  "victory.score": "Puan",
  "victory.clicks": "Tıklama",
  "victory.difficulty": "Zorluk",
  "victory.par": "hedef: {n} tıklama",
  "victory.best": "Rekor",
  "victory.share": "Paylaş",
  "victory.close": "Kapat",
  "victory.copied": "Bağlantı kopyalandı! Meydan okumak için bir arkadaşınıza gönderin.",
  "tip.loading": "Yükleniyor…",

  "help.clickArtist": "Haritayı genişletmek için bir sanatçıya tıklayın",
  "help.clickMovie": "Haritayı genişletmek için bir filme tıklayın",
  "help.share": "İyi eğlenceler, haritanızı paylaşın!",

  "growth.label": "Harita büyümesi",
  "growth.snake": "Yılan",
  "growth.tree": "Ağaç",
  "growth.snakeTitle": "Crazy Snake: keşfedilmemiş adlar her adımda kaybolur, yalnızca yolunuz kalır",
  "growth.treeTitle": "Huge Tree of Death: hiçbir şey silinmez, harita büyümeye devam eder",
  "growth.toSnake": "Yılan: keşfedilmemiş adlar bir sonraki tıklamada kaybolacak",
  "growth.toTree": "Ağaç: bundan sonra haritadan hiçbir şey silinmez",
  "clear": "Haritayı temizle",

  "overview.about": "{name} hakkında",
  "overview.readMore": "{source} üzerinde devamını okuyun",

  "error.service": "Hizmet geçici olarak kullanılamıyor, lütfen birazdan tekrar deneyin",
  "error.generic": "Bir şeyler ters gitti, lütfen tekrar deneyin",
};
