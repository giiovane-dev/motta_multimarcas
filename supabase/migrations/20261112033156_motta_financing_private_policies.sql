-- Explicit deny policies document the private tables' browser access model.
do $$ declare tab text;begin
 foreach tab in array array['financing_details','financing_events','financing_disclosures','financing_tasks','financing_rate_limits'] loop
  execute format('create policy financing_no_browser on motta_private.%I as restrictive for all to anon, authenticated using(false) with check(false)',tab);
 end loop;
end $$;
