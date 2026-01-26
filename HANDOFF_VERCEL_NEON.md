# Vercel + Neon 移行 引き継ぎ書（ヨリソイDX）

## 目的
- フロントから直接Discord Webhookを叩いている実装をやめ、Vercel Functions経由で通知・DB保存する。
- フォーム送信内容をNeon(Postgres)に保存する。

## 現状
- `index.html` 内でDiscord Webhookを直接呼び出し。
- DB保存なし。
- 送信後はPDFダウンロードを表示。

## 推奨アーキテクチャ
- フロント: Vercel（静的）
- API: Vercel Functions（/api/lead）
- DB: Neon Postgres
- 通知: Discord Webhook（Functionsから送信）

## 環境変数
- `DATABASE_URL` : Neonの**pooled接続文字列**
- `DISCORD_WEBHOOK_URL` : Discord Webhook
- `NODE_ENV` : production

## DBスキーマ（案）
```sql
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company text not null,
  name text not null,
  role text,
  industry text not null,
  size text not null,
  phone text not null,
  email text not null,
  message text not null
);
```

## API仕様（案）
- `POST /api/lead`
- Content-Type: application/json
- Body:
  - company, name, industry, size, phone, email, message (required)
  - role (optional)
- Response:
  - 200: { ok: true }
  - 400: { ok: false, message }

## フロント変更（必須）
- `index.html` のDiscord Webhook送信処理を削除し、`/api/lead` へPOST。
- 送信成功時の表示は現状維持でOK。

## Functions実装（イメージ）
- `api/lead.js`
  - バリデーション
  - NeonにINSERT
  - Discord通知（WebhookへPOST）

## メール送信（将来対応）
- 「送信後に資料メール送付」を行う場合は、Resend/SendGrid等のメールAPIを追加。
- その場合、プライバシーポリシーの保存期間・利用目的を追記。

## セキュリティ
- Webhookは必ず環境変数に置く（クライアントに出さない）。
- レート制限やスパム対策（reCAPTCHA等）を検討。

## デプロイ
1. Vercelにリポジトリ接続
2. Neon接続情報をVercel環境変数に登録
3. Functionsを追加してデプロイ

## 参考
- Vercel Functionsドキュメント
- Neon接続ガイド（serverless/pooled接続推奨）
