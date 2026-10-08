import { spreads } from "../data/spreads";
import { jumperChance } from "../utils/tarot";
import { oracleName } from "../utils/persona";

type GuidePanelProps = {
  onClose: () => void;
  backLabel: string;
};

const steps = [
  { title: "問いを置く", text: "いま心にかかっていることを、ひとつだけ書きます。まとまっていなくて構いません。" },
  { title: `${oracleName}に打ち明ける`, text: `カードに触れる前に、${oracleName}が一つだけ問い返します。答えると読みの材料になります。答えずに進むこともできます。` },
  { title: "混ぜて、止めて、切る", text: "カードを混ぜ続けています。ここだと感じたところで止めると、三つの山に切り分けられます。心が向く山を選ぶと、その山がいちばん上に載り、卓に広がります。" },
  { title: "カードを引く", text: "広がったカードから、並べ方の枚数だけ選びます。選んだ順に、卓の下の置き場（過去・現在・未来など）へ運ばれます。もう一度触れると山へ戻せます。" },
  { title: "一枚ずつ、めくってもらう", text: `「カードを返していく」を押すと、${oracleName}が一枚ずつ表に返し、それぞれが何を告げているかを短く語ります。札の意味の覚え書き（裏書き）は、語り終えてから開けます。` },
  { title: "では、どういうことか", text: `すべてのカードが表になったら、並び全体が問いに何を告げているかを読み解き、最後に「今夜の答え」をひとことで告げます。声の準備が整っていれば、${oracleName}がその一言を囁きます。朝なら「今朝の答え」、昼なら「今日の答え」です。` },
  { title: "聞き返す", text: "読み終えたあと、二回まで聞き返せます。希望すれば未使用の札から補足の一枚を添え、気になる点を掘り下げます。補足を引かず、卓のカードを見直してもらうこともできます。" },
  { title: "卓を閉じる", text: `聞き終えたら卓を閉じます。${oracleName}が答えを封書にして手渡し、蝋燭を吹き消します。封書は、月と答えを綴じた一枚の絵として持ち帰れます。` },
];

// はじめての人に、この占い部屋の作法と、特別なカードの意味を案内する。
export const GuidePanel = ({ onClose, backLabel }: GuidePanelProps) => (
  <section className="guide-panel">
    <div className="catalog-heading">
      <div>
        <p className="ornament-kicker">Customs of the Room</p>
        <h1>この部屋の作法</h1>
        <p>カードの引き方と、卓の上で起きることの意味を短くまとめました。</p>
      </div>
    </div>

    <div className="guide-section">
      <h2>占いの流れ</h2>
      <ol className="guide-steps">
        {steps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </div>

    <div className="guide-section">
      <h2>カードの並べ方</h2>
      <p>問いの深さに合わせて選びます。迷ったら3枚引きから。</p>
      <p>ケルト十字は、ウェイト版の十の位置を使います。人物を表す象徴札は別に選ばず、最初の札を状況の中心に置きます。二枚目を横に重ねる配置は、正位置・逆位置とは別です。</p>
      <div className="guide-spreads">
        {spreads.map((spread) => (
          <article className="guide-spread" key={spread.id}>
            <h3>{spread.name}</h3>
            <p>{spread.description}</p>
            <ol>
              {spread.positions.map((position) => (
                <li key={position.id}><strong>{position.name}</strong><span>{position.role}</span></li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>

    <div className="guide-section">
      <h2>卓に現れる特別なカード</h2>
      <dl className="guide-terms">
        <div>
          <dt><span aria-hidden="true">✦</span>こぼれたカード</dt>
          <dd>混ぜる手を止めたとき、ときどき（{Math.round(1 / jumperChance)}回に1回ほど）一枚が表向きに飛び出します。占い師の間では「ジャンピングカード」と呼ばれ、見落とさないでほしい知らせとして脇に置き、語りの最初に触れます。</dd>
        </div>
        <div>
          <dt><span aria-hidden="true">☾</span>山の底</dt>
          <dd>カードを引き終えたあと、残った山のいちばん下にあるカードです。問いの底に静かに流れているもの、本人も気づいていない土台を表すとされ、並べたカードをすべて語り終えてから、最後にめくります。</dd>
        </div>
        <div>
          <dt>補足の一枚</dt>
          <dd>聞き返すときに希望した場合だけ、一枚引きます。卓の札・こぼれた札・山の底・以前の補足札とは重なりません。元の占いを置き換えず、聞き返した点を照らします。通信をやり直しても、同じ札を使います。</dd>
        </div>
        <div>
          <dt>正位置と逆位置</dt>
          <dd>カードは混ぜるときに上下も入れ替わります。逆さに出たカードは、その力が滞っている、内側に向いている、行き過ぎている、といった読み方をします。悪い意味と決まっているわけではありません。</dd>
        </div>
      </dl>
    </div>

    <div className="guide-section">
      <h2>卓を見渡す読み方</h2>
      <p>一枚ずつの意味だけでなく、並び全体からも読みます。たとえば、隣り合うカードの元素（火・水・風・地）が強め合うか打ち消し合うか、大アルカナが多いか、どのスートが欠けているか、同じ数字が重なっていないか。こうした手がかりは卓の脇で数えておき、{oracleName}が語りの中で拾います。</p>
    </div>

    <div className="guide-section">
      <h2>この部屋の決まりごと</h2>
      <p>この部屋はライダー・ウェイト・スミス系の象徴を基準にしています。逆位置・こぼれ札・山の底・月相・数字や元素の技法は、この部屋が選んだ読み方です。タロットの全流派で共通の必須ルールではありません。</p>
      <ul className="guide-notes">
        <li>同じ問いは、同じ夜（朝4時まで）に一度だけ。何度も引くと、カードの声が濁るとされるためです。</li>
        <li>その夜の月の形と時刻を、{oracleName}は語りに添えることがあります。</li>
        <li>語りを最後まで受け取った夜は、帳面に綴じられます（このMacの中だけ）。帳面は月の満ち欠けの巡りごとに並び、いつでも読み返せます。</li>
        <li>この部屋は、昼でもカーテンを引いて蝋燭を灯しています。明け方に来れば窓が白み、夜には遠くで虫が鳴きます。</li>
        <li>カードの言葉は答えそのものではなく、考えるための灯りです。健康・お金・法律などの大事な決断は、現実の確認や信頼できる人への相談と合わせてください。</li>
      </ul>
    </div>

    <div className="guide-back">
      <button className="secondary-button" type="button" onClick={onClose}>{backLabel}</button>
    </div>
  </section>
);
