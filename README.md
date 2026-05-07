# Tarot Reflection

タロットカードの象徴を使って相談内容を整理する、ローカル用の遊び・内省支援Webアプリです。カード抽選、正位置 / 逆位置、スプレッド割り当てはアプリ側で機械的に決め、AIは確定済み結果の解釈だけに使います。

## 起動

依存関係はBunで入れます。

```sh
bun install
```

通常はこちらを使います。画面表示とCodex App Server連携APIが同じ `4192` 番で動きます。

```sh
bun run dev
```

起動後、次を開きます。

http://127.0.0.1:4192/

`Codexに聞く` はこのサーバーから `codex app-server` を子プロセスとして起動します。

ポートを変える場合:

```sh
PORT=4193 bun run server
```

フロントエンドだけをViteで確認する場合:

```sh
bun run dev:frontend
```

この場合、`Codexに聞く` を使うには別ターミナルで `bun run server` も起動してください。

## Codex連携

- フロントエンドにAPIキーは置きません。
- 事前にCodex CLIへログインしておく必要があります。
- Codex App Serverが使えない場合でも、画面のプロンプトをコピーして手動で貼り付けられます。

## 検証

```sh
bun test
bun run build
```
