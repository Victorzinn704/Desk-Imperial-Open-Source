export function buildTelegramBotInfo(username: string | null) {
  return {
    id: 0,
    is_bot: true,
    first_name: 'Desk Imperial',
    username: username ?? 'Desk_Imperial_bot',
    can_join_groups: false,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_manage_bots: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
  } as const
}
