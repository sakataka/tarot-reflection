import { describe, expect, test } from "bun:test";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  test("keeps text after a heading as a paragraph without requiring a blank line", () => {
    expect(renderMarkdown("## 見えている流れ\n本文です。\n\n## 今夜の助言\n次の一歩です。"))
      .toBe("<h3>見えている流れ</h3><p>本文です。</p><h3>今夜の助言</h3><p>次の一歩です。</p>");
  });

  test("renders adjacent ordered items and inline emphasis", () => {
    expect(renderMarkdown("1. **深呼吸する**\n2. 予定をひとつ減らす"))
      .toBe("<ol><li><strong>深呼吸する</strong></li><li>予定をひとつ減らす</li></ol>");
  });

  test("keeps indented explanations and blank lines inside one ordered list", () => {
    const markdown = "1. **目印を書く**  \n   終わりが分かる形にします。\n\n2. **十五分だけ始める**  \n   使うものだけ開きます。";

    expect(renderMarkdown(markdown)).toBe(
      "<ol><li><strong>目印を書く</strong><br />終わりが分かる形にします。</li><li><strong>十五分だけ始める</strong><br />使うものだけ開きます。</li></ol>",
    );
  });

  test("escapes HTML before applying supported markdown", () => {
    expect(renderMarkdown("<script>alert('x')</script>"))
      .toBe("<p>&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;</p>");
  });
});
