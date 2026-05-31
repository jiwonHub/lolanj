import { supabase } from "../../lib/supabase";
import type {
  AramRecordSlots,
  CanyonRecordSlots,
  LineKey,
  ResultKey,
} from "../../shared/types";

export type SaveMatchRecordPayload = {
  title: string;
  team1: CanyonRecordSlots["team1"];
  team2: CanyonRecordSlots["team2"];
  line_results: Record<LineKey, ResultKey>;
  match_result: ResultKey;
};

export type SaveAramMatchRecordPayload = {
  title: string;
  team1: AramRecordSlots["team1"];
  team2: AramRecordSlots["team2"];
  match_result: ResultKey;
};

export const fetchMatchRecordsApi = async () => {
  return await supabase
    .from("match_records")
    .select("*")
    .order("created_at", { ascending: false });
};

export const saveMatchRecordApi = async (payload: SaveMatchRecordPayload) => {
  return await supabase.from("match_records").insert({
    title: payload.title,
    team1: payload.team1,
    team2: payload.team2,
    line_results: payload.line_results,
    match_result: payload.match_result,
  });
};

export const deleteMatchRecordApi = async (recordId: string) => {
  return await supabase.from("match_records").delete().eq("id", recordId);
};

export const fetchAramMatchRecordsApi = async () => {
  return await supabase
    .from("aram_match_records")
    .select("*")
    .order("created_at", { ascending: false });
};

export const saveAramMatchRecordApi = async (
  payload: SaveAramMatchRecordPayload
) => {
  return await supabase.from("aram_match_records").insert({
    title: payload.title,
    team1: payload.team1,
    team2: payload.team2,
    match_result: payload.match_result,
  });
};

export const deleteAramMatchRecordApi = async (recordId: string) => {
  return await supabase.from("aram_match_records").delete().eq("id", recordId);
};