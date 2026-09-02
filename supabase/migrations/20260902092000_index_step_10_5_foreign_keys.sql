-- CAILLOU™ step 10.5: cover feature foreign keys reported by the Supabase performance advisor.

create index if not exists lithon_ledger_feature_id_idx
  on public.lithon_ledger(feature_id);

create index if not exists user_feature_unlocks_feature_id_idx
  on public.user_feature_unlocks(feature_id);
