import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // プリフライトリクエストへの対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    const { company, name, role, industry, size, phone, email, message } = req.body;

    // 必須フィールドのバリデーション
    if (!company || !name || !industry || !size || !phone || !email || !message) {
      return res.status(400).json({
        ok: false,
        message: '必須項目が入力されていません'
      });
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        ok: false,
        message: 'メールアドレスの形式が正しくありません'
      });
    }

    // Neon データベースに保存
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO leads (company, name, role, industry, size, phone, email, message)
      VALUES (${company}, ${name}, ${role || null}, ${industry}, ${size}, ${phone}, ${email}, ${message})
    `;

    // Discord Webhook通知
    const embed = {
      title: "📩 新しい資料請求がありました",
      color: 0x4da3ff,
      fields: [
        { name: "会社名", value: company || "未入力", inline: true },
        { name: "氏名", value: name || "未入力", inline: true },
        { name: "役職", value: role || "未入力", inline: true },
        { name: "業種", value: industry || "未選択", inline: true },
        { name: "従業員規模", value: size || "未選択", inline: true },
        { name: "電話番号", value: phone || "未入力", inline: true },
        { name: "メールアドレス", value: email || "未入力", inline: false },
        { name: "課題・相談内容", value: message || "未入力", inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "ヨリソイDX 資料請求フォーム" }
    };

    // Discord Webhookに送信
    if (process.env.DISCORD_WEBHOOK_URL) {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Error processing lead:', error);
    return res.status(500).json({
      ok: false,
      message: 'サーバーエラーが発生しました'
    });
  }
}
