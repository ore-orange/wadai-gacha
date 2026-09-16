-- シチュエーションの enum 値を英語のキーに変更する（表示名はアプリ側 src/lib/situations.ts で管理）
-- RENAME VALUE なので既存行の値も自動で置き換わる
alter type public.situation_type rename value 'グループワーク' to 'group_work';
alter type public.situation_type rename value 'サークルの新歓' to 'welcome_party';
alter type public.situation_type rename value '合コン' to 'mixer';
