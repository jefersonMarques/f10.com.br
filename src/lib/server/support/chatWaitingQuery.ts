import { sql } from "drizzle-orm";
import { webChatSessions } from "$lib/server/db/chatSchema";

// Somente respostas públicas humanas encerram o ciclo de espera.
export function chatWaitingSinceMs() {
  return sql<number | null>`case
    when ${webChatSessions.closedAt} is not null
      or ${webChatSessions.expiresAt} <= now()
      or ${webChatSessions.aiState} = 'active'
      or exists (
        select 1 from tickets t
        where t.id = ${webChatSessions.ticketId}
          and t.status in ('resolved', 'closed', 'waiting_customer')
      )
    then null
    else (
      with conversation_messages as (
        select created_at, author_type from web_chat_messages
        where session_id = ${webChatSessions.id}
          and ${webChatSessions.ticketId} is null
          and visibility = 'public' and author_type in ('customer', 'user')
        union all
        select created_at, author_type from ticket_messages
        where ticket_id = ${webChatSessions.ticketId}
          and visibility = 'public' and author_type in ('customer', 'user')
      ), response_boundary as (
        select coalesce(${webChatSessions.humanRequestedAt}, ${webChatSessions.aiHandoffAt}, ${webChatSessions.createdAt}) as requested_at,
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
