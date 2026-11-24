import { sql } from "drizzle-orm";

// Somente respostas públicas humanas encerram o ciclo de espera.
export function chatWaitingSinceMs() {
  return sql<number | null>`case
    when "web_chat_sessions"."closed_at" is not null
      or "web_chat_sessions"."expires_at" <= now()
      or "web_chat_sessions"."ai_state" = 'active'
      or exists (
        select 1 from tickets t
        where t.id = "web_chat_sessions"."ticket_id"
          and t.status in ('resolved', 'closed', 'waiting_customer')
      )
    then null
    else (
      with conversation_messages as (
        select created_at, author_type from web_chat_messages
        where session_id = "web_chat_sessions"."id"
          and "web_chat_sessions"."ticket_id" is null
          and visibility = 'public' and author_type in ('customer', 'user')
        union all
        select created_at, author_type from ticket_messages
        where ticket_id = "web_chat_sessions"."ticket_id"
          and visibility = 'public' and author_type in ('customer', 'user')
      ), response_boundary as (
        select coalesce("web_chat_sessions"."human_requested_at", "web_chat_sessions"."ai_handoff_at", "web_chat_sessions"."created_at") as requested_at,
          max(created_at) filter (where author_type = 'user') as last_response_at
        from conversation_messages
      )
      select (extract(epoch from case
        when last_response_at is null or last_response_at < requested_at then requested_at
        else (
          select min(created_at) from conversation_messages
          where author_type = 'customer' and created_at > last_response_at
        )
      end) * 1000)::double precision
      from response_boundary
    )
  end`;
}
