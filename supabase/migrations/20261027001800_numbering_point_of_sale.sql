create or replace function private.valid_technical_sheet(p_data jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare entry record; row_data jsonb; field record;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>50000 then return false; end if;
 for entry in select * from jsonb_each(p_data) loop
  if entry.key='composition' then
   if jsonb_typeof(entry.value)<>'array' then return false; end if;
   if jsonb_array_length(entry.value)>20 then return false; end if;
   for row_data in select value from jsonb_array_elements(entry.value) loop
    if jsonb_typeof(row_data)<>'object' then return false; end if;
    for field in select * from jsonb_each(row_data) loop
     if field.key not in ('work_type','quantity','copies','paper_color','grammage','perforated','eyeleted') or jsonb_typeof(field.value)<>'string' or length(field.value#>>'{}')>120 then return false; end if;
    end loop;
   end loop;
  elsif entry.key='number_ranges' then
   if jsonb_typeof(entry.value)<>'array' then return false; end if;
   if jsonb_array_length(entry.value)>10 then return false; end if;
   for row_data in select value from jsonb_array_elements(entry.value) loop
    if jsonb_typeof(row_data)<>'object' then return false; end if;
    if not(row_data?'from') or not(row_data?'to') then return false; end if;
    for field in select * from jsonb_each(row_data) loop
     if field.key not in ('from','to','point_of_sale') or jsonb_typeof(field.value)<>'string' or length(field.value#>>'{}')>60 then return false; end if;
    end loop;
   end loop;
  else
   if entry.key not in ('forms','observations','printing_color','pad_details','original_attached','width','height','yield_quantity','sheet_format','total_sheets','printer_code','other_info') or jsonb_typeof(entry.value)<>'string' or length(entry.value#>>'{}')>2000 then return false; end if;
  end if;
 end loop;
 return true;
end $$;
