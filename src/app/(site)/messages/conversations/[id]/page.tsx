import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatRoom, type ChatMessage } from '@/components/ChatRoom';
import { isSupabaseConfigured } from '@/lib/config';

export const metadata = { title: '私信' };

export default async function ChatPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) redirect('/login?next=/messages');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/messages');

  // RLS 确保只有会话双方能读到会话
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, user_a, user_b')
    .eq('id', params.id)
    .maybeSingle();
  if (!conversation) notFound();

  const otherUserId = conversation.user_a === user.id ? conversation.user_b : conversation.user_a;
  const { data: otherUser } = await supabase
    .from('profiles')
    .select('id, username, nickname, avatar_url')
    .eq('id', otherUserId)
    .maybeSingle();
  if (!otherUser) notFound();

  const { data: messages } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, read, created_at')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })
    .limit(200);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <ChatRoom
        conversationId={params.id}
        currentUserId={user.id}
        otherUser={otherUser}
        initialMessages={(messages ?? []) as ChatMessage[]}
      />
    </div>
  );
}
