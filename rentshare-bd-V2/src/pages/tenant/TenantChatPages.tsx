import React, { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Send, Trash2, UserPlus } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layouts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, getChatServiceUrl, getStoredToken } from '../../lib/api';

export function RoommateGroupPage() {
  const { user, showToast } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const load = () => {
    apiFetch<{ groups: any[] }>('/api/groups')
      .then((d) => setGroups(d.groups))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName }),
      });
      setNewGroupName('');
      showToast('Roommate group created', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const addMember = async (groupId: number, e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteEmail('');
      showToast('Roommate added to group', 'success');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const removeMember = async (groupId: number, userId: number) => {
    try {
      await apiFetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
      showToast('Member removed', 'info');
      load();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <DashboardLayout title="Roommate Group">
      <div className="space-y-6">
        <form
          onSubmit={createGroup}
          className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            required
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Create new group (e.g. Flat 5A - Dhanmondi)"
            className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold whitespace-nowrap shrink-0"
          >
            Create Group
          </button>
        </form>

        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">{g.name}</h2>
                {g.property_title && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Linked Property: {g.property_title} ({g.area})
                  </p>
                )}
              </div>
              <span className="text-xs font-mono text-slate-600">
                {g.members?.length || 0} members
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {g.members?.map((m: any) => (
                <div key={m.user_id} className="px-4 py-3 flex items-center justify-between text-sm bg-white">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {m.full_name} {m.user_id === user?.id ? '(You)' : ''}
                    </p>
                    <p className="text-xs text-slate-500">{m.email} · {m.role}</p>
                  </div>
                  {(g.my_role === 'admin' || m.user_id === user?.id) && (
                    <button
                      type="button"
                      onClick={() => removeMember(g.id, m.user_id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                      aria-label={`Remove ${m.full_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={(e) => addMember(g.id, e)} className="flex gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Add registered roommate by email (e.g. tanvir@rentshare.bd)"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            </form>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

export function GroupChatPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [onlineIds, setOnlineIds] = useState<number[]>([]);
  const [draft, setDraft] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiFetch<{ groups: any[]; onlineUserIds: number[] }>('/api/groups')
      .then((d) => {
        setGroups(d.groups);
        setOnlineIds(d.onlineUserIds || []);
        if (d.groups.length > 0) setActiveGroupId(d.groups[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    const chatUrl = getChatServiceUrl();
    const socket = chatUrl ? io(chatUrl, { auth: { token } }) : io({ auth: { token } });
    socketRef.current = socket;

    socket.on('presence:update', (data: { onlineUserIds: number[] }) => {
      setOnlineIds(data.onlineUserIds || []);
    });

    socket.on('group:message:new', (msg: any) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeGroupId) return;
    apiFetch<{ messages: any[]; onlineUserIds: number[] }>(`/api/groups/${activeGroupId}/messages`)
      .then((d) => {
        setMessages(d.messages);
        setOnlineIds(d.onlineUserIds || []);
        socketRef.current?.emit('group:join', activeGroupId);
      })
      .catch(() => {});
  }, [activeGroupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeGroupId || !socketRef.current) return;
    socketRef.current.emit('group:message', { groupId: activeGroupId, content: draft.trim() });
    setDraft('');
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <DashboardLayout title="Roommate Group Chat">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
        {/* Group & Members Rail */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 p-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500">Your Groups</p>
          <div className="space-y-1">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroupId(g.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  g.id === activeGroupId
                    ? 'bg-indigo-50 text-[#4F46E5] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {activeGroup && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">Members Presence</p>
              <ul className="space-y-2 text-xs">
                {activeGroup.members?.map((m: any) => {
                  const isOnline = onlineIds.includes(m.user_id) || m.user_id === user?.id;
                  return (
                    <li key={m.user_id} className="flex items-center justify-between text-slate-700">
                      <span className="truncate">{m.full_name}</span>
                      <span className={isOnline ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Chat Stream */}
        <div className="md:col-span-8 flex flex-col h-[540px]">
          <div className="px-5 py-3.5 border-b border-slate-200 font-display font-bold text-slate-900">
            {activeGroup?.name || 'Select a Roommate Group'}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8FAFC]">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <span className="text-[11px] text-slate-500 mb-1">
                    {m.sender_name} · {String(m.created_at).slice(11, 16) || 'Now'}
                  </span>
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${
                      mine
                        ? 'bg-[#4F46E5] text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message your roommates..."
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function PrivateChatPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [onlineIds, setOnlineIds] = useState<number[]>([]);
  const [draft, setDraft] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    apiFetch<{ contacts: any[]; onlineUserIds: number[] }>('/api/groups/dm/contacts')
      .then((d) => {
        setContacts(d.contacts);
        setOnlineIds(d.onlineUserIds || []);
        if (d.contacts.length > 0) setActiveId(d.contacts[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    const chatUrl = getChatServiceUrl();
    const socket = chatUrl ? io(chatUrl, { auth: { token } }) : io({ auth: { token } });
    socketRef.current = socket;
    socket.on('dm:message:new', (msg: any) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    apiFetch<{ messages: any[] }>(`/api/groups/dm/${activeId}`)
      .then((d) => setMessages(d.messages))
      .catch(() => {});
  }, [activeId]);

  const sendDm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeId || !socketRef.current) return;
    socketRef.current.emit('dm:message', { receiverId: activeId, content: draft.trim() });
    setDraft('');
  };

  const activeContact = contacts.find((c) => c.id === activeId);

  return (
    <DashboardLayout title="Private 1:1 Chat">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 mb-2">Contacts</p>
          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between ${
                c.id === activeId ? 'bg-indigo-50 text-[#4F46E5] font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{c.full_name}</span>
              <span className="text-[11px] capitalize text-slate-400">
                {onlineIds.includes(c.id) ? 'Online' : c.role}
              </span>
            </button>
          ))}
        </div>

        <div className="md:col-span-8 flex flex-col h-[540px]">
          <div className="px-5 py-3.5 border-b border-slate-200 font-display font-bold text-slate-900">
            {activeContact ? `${activeContact.full_name} (${activeContact.role})` : 'Select a contact'}
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8FAFC]">
            {messages
              .filter(
                (m) =>
                  (m.sender_id === user?.id && m.receiver_id === activeId) ||
                  (m.sender_id === activeId && m.receiver_id === user?.id)
              )
              .map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    <span className="text-[11px] text-slate-500 mb-1">
                      {m.sender_name} · {String(m.created_at).slice(11, 16) || 'Now'}
                    </span>
                    <div
                      className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${
                        mine ? 'bg-[#4F46E5] text-white' : 'bg-white border border-slate-200 text-slate-900'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
          </div>
          <form onSubmit={sendDm} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a direct message..."
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
