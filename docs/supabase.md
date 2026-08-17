# クラウド共有（Supabase）の設定

既定では、視察データは**その端末のブラウザ内だけ**に保存される。
機種変更やキャッシュ削除で消えるうえ、店長や事務員と結果を共有できない。

Supabase を繋ぐと、同じデータを複数の端末で見られるようになる。
**環境変数を入れるまでは何も変わらない**（端末内保存のまま動く）ので、
必要になった時点で設定すればよい。

## 1. Supabase プロジェクトを作る

1. https://supabase.com でプロジェクトを作成
2. Project Settings → API から次の2つを控える
   - **Project URL**
   - **anon public** キー

## 2. テーブルとバケットを作る

Supabase の SQL Editor で以下を実行する。

```sql
-- 視察データ本体。1行に全部入れる（件数が少ないので分割しない）
create table if not exists checklist_data (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table checklist_data enable row level security;

-- 匿名キーでの読み書きを許可する。
-- 社内の限られた人だけが URL を知っている前提の運用。
-- 外部に URL が漏れると誰でも読める点は理解したうえで使う。
create policy "anon can read"   on checklist_data for select to anon using (true);
create policy "anon can insert" on checklist_data for insert to anon with check (true);
create policy "anon can update" on checklist_data for update to anon using (true) with check (true);
```

次に Storage → New bucket で **`checklist-photos`** を作る（Public でよい）。
バケットにも同様のポリシーを付ける。

```sql
create policy "anon can read photos"   on storage.objects for select to anon
  using (bucket_id = 'checklist-photos');
create policy "anon can write photos"  on storage.objects for insert to anon
  with check (bucket_id = 'checklist-photos');
create policy "anon can update photos" on storage.objects for update to anon
  using (bucket_id = 'checklist-photos');
create policy "anon can delete photos" on storage.objects for delete to anon
  using (bucket_id = 'checklist-photos');
```

## 3. Vercel に環境変数を入れる

Vercel → プロジェクト → Settings → Environment Variables に追加し、再デプロイする。

| 変数名 | 値 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public キー |
| `NEXT_PUBLIC_SUPABASE_ROW_ID` | 省略可。既定は `age3-tenpo-checklist` |

ローカルで試すときは `.env.local` に同じものを書く。

## 動き方

- **端末内が正**。入力はまず localStorage / IndexedDB に保存し、そのうえでクラウドへ写す。
  電波が無い店舗でも入力は止まらない
- 起動時はクラウドを優先して読み、失敗したら端末内のデータで動く
- 写真は `checklist-photos` バケットに置き、端末内に無い写真だけクラウドから取りに行く
- クラウドが落ちていてもアプリは動く（送信の失敗は握りつぶし、端末内保存を正とする）

## 注意

- **最後に保存した端末の内容で上書きされる。** 2人が同時に別々の店舗を入力すると、
  後から保存した方の内容だけが残る。3店を1人で回る現在の運用なら問題ないが、
  同時入力を始めるなら店舗ごとに行を分ける（`NEXT_PUBLIC_SUPABASE_ROW_ID` を分ける）か、
  項目単位の保存に作り変える必要がある
- anon キーは公開される。URL を知っている人は誰でも読み書きできる。
  社外に出す可能性があるなら Supabase Auth を入れてポリシーを絞る
- 環境変数を消せば、いつでも端末内保存だけの状態に戻せる
