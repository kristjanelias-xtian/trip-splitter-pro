-- Atomic participant reassignment. Applies a precomputed WriteDiff in one
-- transaction. Creator-only. No business logic lives here; the client
-- computes the diff via buildWriteDiff().
create or replace function public.reassign_participant(p_trip_id uuid, p_diff jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_ins jsonb;
  v_row jsonb;
begin
  select created_by into v_creator from trips where id = p_trip_id;
  if v_creator is null then
    raise exception 'Trip not found';
  end if;
  if auth.uid() is null or auth.uid() <> v_creator then
    raise exception 'Only the trip creator can reassign participants';
  end if;

  v_ins := p_diff -> 'insertParticipant';
  if v_ins is not null and v_ins <> 'null'::jsonb then
    insert into participants (id, trip_id, name, is_adult, email, user_id, wallet_group)
    values (
      (v_ins->>'id')::uuid,
      p_trip_id,
      v_ins->>'name',
      coalesce((v_ins->>'is_adult')::boolean, true),
      v_ins->>'email',
      nullif(v_ins->>'user_id', '')::uuid,
      v_ins->>'wallet_group'
    );
  end if;

  for v_row in select value from jsonb_array_elements(coalesce(p_diff->'updateExpenses', '[]'::jsonb))
  loop
    update expenses set
      paid_by = coalesce((v_row->>'paid_by')::uuid, paid_by),
      distribution = coalesce(v_row->'distribution', distribution),
      updated_at = now()
    where id = (v_row->>'id')::uuid and trip_id = p_trip_id;
  end loop;

  for v_row in select value from jsonb_array_elements(coalesce(p_diff->'updateSettlements', '[]'::jsonb))
  loop
    update settlements set
      from_participant_id = coalesce((v_row->>'from_participant_id')::uuid, from_participant_id),
      to_participant_id = coalesce((v_row->>'to_participant_id')::uuid, to_participant_id),
      updated_at = now()
    where id = (v_row->>'id')::uuid and trip_id = p_trip_id;
  end loop;

  delete from settlements
  where trip_id = p_trip_id
    and id in (
      select (value #>> '{}')::uuid
      from jsonb_array_elements(coalesce(p_diff->'deleteSettlements', '[]'::jsonb))
    );

  if (p_diff->>'deleteParticipantId') is not null then
    delete from participants
    where id = (p_diff->>'deleteParticipantId')::uuid and trip_id = p_trip_id;
  end if;
end;
$$;

grant execute on function public.reassign_participant(uuid, jsonb) to authenticated;
