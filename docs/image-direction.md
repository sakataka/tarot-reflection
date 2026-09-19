# 画像の制作方針

2026-09-19 更新。組み込みの image_gen で生成。ツールはモデル選択・モデル名の確認を公開していないため、特定のモデルバージョンは記録しない。

全28点を `public/cards/` に保存。大アルカナ22点、小アルカナ4スートの共通絵4点、裏面1点、導入の風景1点。小アルカナのランクは既存仕様どおり画面側で重ねて表示する。

## 共通スタイル・プロンプト

Use case: stylized-concept. Make ONE original image for the same coherent Moonlit Tarot collection as the attached reference. Reference is STYLE ONLY, not layout or subject. Match deep midnight indigo and muted teal, antique brushed gold and ivory moonlight; painterly gouache, delicate etched linework, subtle tactile paper grain. Mature, atmospheric, elegant, restrained, visually legible. No letters, words, numbers, logos, watermark.

カード表面の指定: Portrait 2:3 tarot face, flat full bleed artwork, not a photographed card. Thin elegant double-line antique gold frame inset 5%, consistent with reference. No title panel.

風景の指定: Landscape 3:2 image, full bleed.

全画像のスタイル参照には、この更新で生成した `card_back.webp` の元画像を使用。カード名とランクはHTMLで表示し、生成画像には文字を入れない。WebP品質84に圧縮し、カードは640×960px、風景は幅1280pxで配信。

「吊るされた男」は、静かな水面に逆さに映る人物で、視点の転換と内省を表現したオリジナルの図案。

## 裏面プロンプト

Use case: stylized-concept. Create one exquisite atmospheric tarot card BACK for a coherent Moonlit Tarot deck. Portrait 2:3 aspect. Full bleed flat artwork, not a photographed card. Deep midnight indigo, muted teal, antique brushed gold, ivory moonlight. Painterly gouache and delicate etched linework on subtle paper grain; restrained, mature, contemplative, not flashy fantasy. Perfect 180-degree rotationally symmetric celestial design: central fine gold orbital mandala, mirrored crescent moons, tiny sparse stars, botanical laurel sprigs, thin elegant double-line frame inset 5%. Generous quiet dark areas. No letters, numbers, words, logos, watermark.

## 各画像の主題

- `major_00_fool.webp`: The Fool: a young cloaked traveler and small white dog at the edge of a moonlit cliff, small travel bundle, white flower, distant mountains, open hopeful horizon.
- `major_01_magician.webp`: The Magician: a poised robed artisan at a stone table bearing a chalice, sword, wand and gold pentacle, one hand raised to the stars and one pointing to earth, subtle infinity halo.
- `major_02_high_priestess.webp`: The High Priestess: serene fully clothed priestess holding a closed scroll between two pale stone pillars, crescent moon at her feet, veil with pomegranate motifs, still water.
- `major_03_empress.webp`: The Empress: compassionate crowned woman in flowing ivory robes seated in a lush moonlit garden, wheat, pomegranates and a gently flowing stream, abundant growth.
- `major_04_emperor.webp`: The Emperor: dignified mature ruler seated on a solid stone throne with subtle ram carvings, holding a gold orb and scepter, austere mountain landscape.
- `major_05_hierophant.webp`: The Hierophant: wise robed teacher seated within a vaulted stone sanctuary, two students seen from behind, crossed antique keys, warm candlelight.
- `major_06_lovers.webp`: The Lovers: two fully clothed adult figures facing one another under an arch of intertwined trees, a luminous winged presence overhead, quiet choice and harmony.
- `major_07_chariot.webp`: The Chariot: resolute armored charioteer beneath a star-patterned canopy, two sphinxes one pale one dark pulling a stone chariot, moonlit city far behind.
- `major_08_strength.webp`: Strength: gentle robed woman calmly resting a hand on the mane of a majestic lion, subtle infinity halo, wildflowers, composed tenderness.
- `major_09_hermit.webp`: The Hermit: solitary elder in a deep blue cloak standing on a rocky mountain, lifting a small antique lantern containing a bright star, mist below.
- `major_10_wheel_of_fortune.webp`: Wheel of Fortune: monumental antique golden wheel suspended above a misty landscape, subtle celestial and botanical emblems around its rim, no letters or glyph writing, cyclical movement.
- `major_11_justice.webp`: Justice: composed seated woman between stone pillars holding balanced golden scales in one hand and an upright straight sword in the other, clear frontal symmetrical composition.
- `major_12_hanged_man.webp`: Use case: stylized-concept. One tarot illustration representing a change in perspective, patience and quiet contemplation. Portrait 2:3 flat artwork. Match the attached reference STYLE ONLY: midnight indigo, muted teal, antique brushed gold, ivory moonlight, painterly gouache with delicate etching, paper grain, thin gold double-line frame inset 5%. Scene: a tranquil fully clothed traveler sits cross-legged safely on a stone beside a very still reflecting pool beneath a willow. The upside-down reflection of the traveler is the dominant central image in the water, a soft luminous halo around the reflected head. Contemplative inverted perspective, surreal reflection, serene landscape. No ropes, no hanging or suspension, no injury, no dangerous activity, no text, letters, numbers or watermark. This is an original symbolic card about seeing the world from another angle.
- `major_13_death.webp`: Death: symbolic transformation, a dark cloaked figure holding a white rose beside an old stone arch, fallen autumn leaves becoming new pale blossoms, distant dawn; contemplative and nonviolent.
- `major_14_temperance.webp`: Temperance: serene fully robed angel carefully pouring a flowing ribbon of water between two golden vessels, one foot on shore and one in a shallow pool, balanced wings.
- `major_15_devil.webp`: The Devil: imposing horned shadow figure above two fully clothed adults with visibly loose chains they can remove, small amber flame, symbolic attachment, no gore or nudity.
- `major_16_tower.webp`: The Tower: lightning striking the crown of a tall stone tower on a rocky coast, glowing fragments and wind, profound sudden change, no injured people.
- `major_17_star.webp`: The Star: fully clothed kneeling figure pouring water from two vessels beside a calm pool, one large eight-pointed gold star with seven smaller stars, hopeful clear night.
- `major_18_moon.webp`: The Moon: luminous full moon above a winding path between two ancient towers, a dog and wolf on opposing banks, small crayfish emerging from water, mysterious blue mist.
- `major_19_sun.webp`: The Sun: radiant antique gold sun over a peaceful walled garden, fully clothed joyful youthful rider on a white horse, sunflowers, warmth within the restrained indigo palette.
- `major_20_judgement.webp`: Judgement: luminous angel high in the sky sounding a long trumpet, three fully clothed figures below lifting their faces to dawn, awakening and renewal, no graves or horror.
- `major_21_world.webp`: The World: graceful fully clothed figure holding two slender wands within a large oval laurel wreath, four subtle symbolic guardians at the corners: human, eagle, lion, bull; harmony and completion.
- `minor_wands.webp`: Suit of Wands: one elegant living wooden staff with small fresh leaves, standing in a moonlit rocky garden, small warm ember-like lights, growth and energy. Leave corners quiet for separately rendered rank labels.
- `minor_cups.webp`: Suit of Cups: one elegant antique golden chalice on a stone ledge beside still moonlit water, delicate water lilies and reflected stars, calm emotion. Leave corners quiet for separately rendered rank labels.
- `minor_swords.webp`: Suit of Swords: one straight silver sword upright above a misty mountain landscape, balanced fine clouds, a small laurel branch, clarity and thought. Leave corners quiet for separately rendered rank labels.
- `minor_pentacles.webp`: Suit of Pentacles: one large antique gold coin with an engraved five-pointed star centered among subtle leaves, stones and roots in a moonlit garden, grounded abundance. Leave corners quiet for separately rendered rank labels.
- `selection_oracle.webp`: A quiet moonlit contemplative garden: still reflecting pool, small ancient stone archway, distant misty mountains, slender cypress and olive trees, a few stars and soft golden light on the water. No people, no tarot cards. Broad landscape composition for a shallow website banner; keep key scenic details across the middle horizontal band. No frame.
