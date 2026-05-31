import { supabase } from "../../lib/supabase";

export type AddMemberPayload = {
  name: string;
  nickname: string;
  highest_tier: string;
  current_tier: string;
  main_line: string;
  sub_line: string;
  memo: string;
};

export type UpdateMemberPayload = {
  name: string;
  nickname: string;
  highest_tier: string;
  current_tier: string;
  main_line: string;
  sub_line: string;
  memo: string;
};

export const fetchMembersApi = async () => {
  return await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });
};

export const addMemberApi = async (payload: AddMemberPayload) => {
  return await supabase.from("members").insert({
    name: payload.name,
    nickname: payload.nickname,
    highest_tier: payload.highest_tier,
    current_tier: payload.current_tier,
    main_line: payload.main_line,
    sub_line: payload.sub_line,
    memo: payload.memo,
    is_active: true,
    member_role: null,
  });
};

export const deleteMemberApi = async (memberId: string) => {
  return await supabase.from("members").delete().eq("id", memberId);
};

export const updateMemberApi = async (
  memberId: string,
  payload: UpdateMemberPayload
) => {
  return await supabase
    .from("members")
    .update({
      name: payload.name,
      nickname: payload.nickname,
      highest_tier: payload.highest_tier,
      current_tier: payload.current_tier,
      main_line: payload.main_line,
      sub_line: payload.sub_line,
      memo: payload.memo,
    })
    .eq("id", memberId);
};

export const clearOwnerRoleApi = async () => {
  return await supabase
    .from("members")
    .update({
      member_role: null,
    })
    .eq("member_role", "모임장");
};

export const updateMemberRoleApi = async (
  memberId: string,
  memberRole: string | null
) => {
  return await supabase
    .from("members")
    .update({
      member_role: memberRole,
    })
    .eq("id", memberId);
};