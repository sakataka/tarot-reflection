# Dotsへの制作依頼：Moonlit Tarotの数札40枚

対象はGitHubリポジトリ **[sakataka/tarot-reflection](https://github.com/sakataka/tarot-reflection)** の `main` ブランチです。以下のパスはすべてリポジトリのルートからの相対パスです。Macのローカル絶対パスは使いません。

## 目的と範囲

既存のMoonlit Tarotと同じ画風で、小アルカナ4スートそれぞれのエース〜10、計40枚を制作してください。ライダー・ウェイト・スミス系の場面と主要な象徴を基準にし、現在の大アルカナ・人物札と一緒に並べても違和感のない仕上がりにします。

画像制作と納品だけをお願いします。既存画像の上書き・削除、コード・依存関係・設定の変更は不要です。組み込みはCodexが担当します。この依頼文も変更しないでください。

## 最初に読むもの・見るもの

- 制作方針：`docs/image-direction.md`
- 色・線・紙の質感・枠：`public/cards/card_back.webp`
- 人物：`public/cards/major_02_high_priestess.webp`、`public/cards/major_04_emperor.webp`、`public/cards/cups_11.webp`、`public/cards/pentacles_13.webp`
- 道具の造形：`public/cards/minor_wands.webp`、`public/cards/minor_cups.webp`、`public/cards/minor_swords.webp`、`public/cards/minor_pentacles.webp`

参照画像を実際に見てから制作してください。色・筆致・枠・雰囲気を合わせるための参照です。裏面の模様や既存の人物・構図をそのまま流用しないでください。

主題確認にはA. E. Waite『The Pictorial Key to the Tarot』Part IIの小アルカナ各札を参照してください：[原典の目次](https://sacred-texts.com/tarot/pkt/index.htm)。以下の主題は、その場面を既存の月夜デッキで再解釈する指定です。

## 納品先とファイル名

GitHubリポジトリ内の **`public/cards/`** に、次の40ファイルを置いてください。

```text
public/cards/wands_01.webp       ... public/cards/wands_10.webp
public/cards/cups_01.webp        ... public/cards/cups_10.webp
public/cards/swords_01.webp      ... public/cards/swords_10.webp
public/cards/pentacles_01.webp   ... public/cards/pentacles_10.webp
```

命名規約は **`public/cards/{suit}_{rank}.webp`** です。

- `suit`：`wands` / `cups` / `swords` / `pentacles` のいずれか。小文字、複数形。
- `rank`：エースは `01`、以下 `02`〜`10`。必ず2桁。
- 各画像：縦 **640×960px**、WebP、品質84を目安。1ファイルに1枚。
- 番号・名前・文字は画像に入れない。アプリ側で表示します。
- 左上・右下はラベルを置ける静かな余白を保つ。
- `minor_cups.webp` などの共通絵や、`cups_11.webp` などの人物札を置き換えない。
- 高解像度の制作原本、比較シート、一時ファイルはこの納品先に混ぜない。

## 共通生成プロンプト

以下に各札の `CARD SUBJECT` を付けて使ってください。画像参照を渡せるツールでは上記の既存画像をスタイル参照として渡します。

```text
Create ONE original numbered Minor Arcana illustration for the existing
Moonlit Tarot collection in the supplied GitHub repository.

Inspect and use the supplied existing deck images as STYLE references.
Match their deep midnight indigo, muted teal and moonlit blue-grey,
antique brushed gold and ivory moonlight. Use painterly gouache,
delicate etched linework and subtle tactile paper grain.
The result must look like another card from this same deck.

Portrait 2:3 tarot face, flat artwork, not a photographed card.
Thin double-line antique gold frame inset approximately 5%, matching
the existing deck. Full artwork within the frame, no title panel.
Keep the upper-left and lower-right corners quiet for HTML rank labels.

Follow the Rider-Waite-Smith scene and central symbolic relationships
specified below, reinterpreted in the Moonlit Tarot palette.
Preserve the EXACT number of suit objects stated for this card.
Do not add decorative cups, swords, wands or pentacles that confuse
the count. Keep all counted objects visually distinguishable.

People, gestures and suit objects must remain readable at small size.
Restrained, mature, contemplative, elegant; natural human anatomy.
Clothed figures. Symbolic difficult scenes without gore.
Use a consistent moonlit atmosphere, but do not add a large full moon
to every card or allow it to replace this card's central subject.
Do not turn the scene into a generic beautiful landscape.

No letters, words, numerals, titles, logos or watermark.
No neon colours, glossy 3D rendering, anime styling, elaborate fantasy
armour, excessive ornament or bright saturated red/green.
Use muted suit accents only; midnight indigo remains dominant.

CARD SUBJECT:
[Insert the corresponding subject from the list below.]
```

## 各札のCARD SUBJECT

下表のファイル名には、納品時に `public/cards/` を付けてください。

| ファイル | CARD SUBJECT |
|---|---|
| `wands_01.webp` | A hand emerging from a luminous cloud offers ONE living wand with fresh leaves; distant fertile land. |
| `wands_02.webp` | A cloaked person on a stone terrace holds a small globe and ONE wand; a SECOND wand is fixed beside them; they survey the distant land. Exactly TWO wands. |
| `wands_03.webp` | A person seen from behind watches distant sailing ships from a high shore, with THREE planted wands around them. |
| `wands_04.webp` | FOUR upright wands support a flower garland, forming a welcoming threshold; two people celebrate beyond it. |
| `wands_05.webp` | Five people engage in energetic, non-injurious practice or contention, each carrying ONE wand. Exactly FIVE wands. |
| `wands_06.webp` | A rider on a horse holds ONE wand crowned with a victory laurel; companions carry FIVE more wands. Exactly SIX wands. |
| `wands_07.webp` | A person on higher ground defends their position with ONE wand against SIX wands rising from below. Exactly SEVEN wands. |
| `wands_08.webp` | EIGHT separate wands travel diagonally through open air above land and a river; no people and no extra wands. |
| `wands_09.webp` | A weary but alert person with a simple head bandage holds ONE wand; EIGHT upright wands stand behind them. Exactly NINE wands. |
| `wands_10.webp` | A person bends under a bundle of exactly TEN distinguishable wands, carrying them toward a distant settlement. |
| `cups_01.webp` | A hand emerging from a luminous cloud offers ONE golden cup, overflowing in five streams into water with lilies; a small white dove above it. |
| `cups_02.webp` | Two people face each other and exchange TWO cups; a winged lion emblem and intertwined serpents above express reciprocal union. |
| `cups_03.webp` | Three people in a garden raise THREE cups together in celebration; fruit and flowers at their feet. |
| `cups_04.webp` | A seated person beneath a tree looks inward; THREE cups rest before them, and a hand from a cloud offers a FOURTH. |
| `cups_05.webp` | A cloaked person looks down at THREE overturned cups; TWO upright cups remain behind them; a river and bridge offer a way onward. |
| `cups_06.webp` | In a sheltered courtyard, one younger figure offers another a flower-filled cup; SIX flower-filled cups in total. |
| `cups_07.webp` | A silhouetted person faces SEVEN cups floating in mist, each offering a different vision: a face, veiled figure, serpent, castle, jewels, laurel, and dragon. |
| `cups_08.webp` | A cloaked traveller walks away toward rocky heights, leaving EIGHT cups arranged in the foreground with a visible gap; a moonlit sky. |
| `cups_09.webp` | A quietly satisfied seated person folds their arms; NINE cups form a clear curved display behind them. |
| `cups_10.webp` | Two adults and two children share a peaceful moment beneath an arc of TEN cups in a luminous rainbow; a home and river in the distance. |
| `swords_01.webp` | A hand emerging from a luminous cloud raises ONE upright sword, crowned with a gold crown and olive and palm branches; austere mountains. |
| `swords_02.webp` | A blindfolded seated person holds TWO crossed swords before their chest; still water and a crescent moon behind them. |
| `swords_03.webp` | THREE swords pass through a symbolic heart suspended against rain clouds; no anatomical organ, blood or injured person. |
| `swords_04.webp` | A resting carved stone knight lies in a quiet chapel; THREE swords hang above and ONE lies horizontally below. Exactly FOUR swords. |
| `swords_05.webp` | A standing person gathers THREE swords as two others walk away; TWO swords lie on the ground. Exactly FIVE swords; tension without injury. |
| `swords_06.webp` | A ferryman carries a seated adult and child across water; SIX upright swords are clearly visible in the boat. |
| `swords_07.webp` | A person glances back while quietly carrying FIVE swords away from a camp; TWO swords remain planted behind. Exactly SEVEN swords. |
| `swords_08.webp` | A blindfolded person with loose cloth bindings stands among EIGHT swords; an open path remains available; no injury. |
| `swords_09.webp` | A distressed person sits awake on a bed with their face in their hands; NINE horizontal swords hang above; a patterned coverlet. |
| `swords_10.webp` | A prone, fully clothed figure is seen from behind, with TEN swords aligned along their back in the traditional symbolic arrangement; no blood or wounds; dawn breaks beyond dark clouds. |
| `pentacles_01.webp` | A hand emerging from a luminous cloud offers ONE gold pentacle above a flowering garden and an archway opening toward mountains. |
| `pentacles_02.webp` | A person balances TWO pentacles linked by an infinity-shaped ribbon; ships rise and fall on waves behind them. |
| `pentacles_03.webp` | A craftsperson and two collaborators examine work in a stone sanctuary; THREE pentacles are carved distinctly in the arch above them. |
| `pentacles_04.webp` | A seated person holds ONE pentacle to their chest, wears ONE above their crown, and rests their feet on TWO more. Exactly FOUR pentacles. |
| `pentacles_05.webp` | Two travellers in worn clothes pass through snow outside a warmly lit window containing FIVE pentacles; hardship without caricature or gore. |
| `pentacles_06.webp` | A standing person holds balanced scales and gives coins to two kneeling figures; SIX large pentacle emblems appear above; tiny plain coins carry no star marks. |
| `pentacles_07.webp` | A gardener rests on a tool and studies a growing vine bearing SEVEN pentacles, weighing the result of patient work. |
| `pentacles_08.webp` | A seated craftsperson engraves ONE pentacle; SIX finished pentacles hang nearby and ONE rests below. Exactly EIGHT pentacles. |
| `pentacles_09.webp` | A composed person with a hooded falcon stands in a fruitful vineyard containing NINE pentacles; a small snail below. |
| `pentacles_10.webp` | An elder, two adults, a child and two dogs gather by a stone gateway; TEN pentacles form a clear arrangement across this scene of shared lasting prosperity. |

## 制作順と品質確認

1. まず `cups_02.webp`、`swords_09.webp`、`pentacles_08.webp` の3枚を試作する。
2. 既存の大アルカナ・人物札と並べ、色・枠・人物表現が合うことを確認してから残りを制作する。
3. 各札の記号の数、主要な場面、手と道具の形、文字の混入、640×960pxであることを確認する。
4. 複数枚をまとめて生成した場合も、最終納品は1枚ずつ独立したファイルにする。格子の継ぎ目・隣の絵・不揃いな枠を残さない。
5. 構図や記号の数が崩れた画像はその札だけ再生成する。ソードの10など難しい主題でも、札の意味を失う別の風景へ黙って置き換えず、解決できなければその札を報告する。
6. GitHub上で受け渡せるよう、作成した画像だけをcommit / push、またはPRで納品する。作業時の既存変更を保護する。最終報告にはブランチ・commitまたはPR、40枚の納品一覧、未制作・未解決の札があればその一覧を添える。

この依頼は画像生成そのものを含みます。プロンプトや計画だけで完了せず、指定場所へ実ファイルを納品してください。
