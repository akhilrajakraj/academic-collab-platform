'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

type Role = 'OWNER' | 'EDITOR' | 'REVIEWER' | 'VIEWER';
type Collaborator = { userId: string; displayName: string; role: Role };
type Props = { documentId: string; token: string | null };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
const SOCKET_URL = new URL(API_BASE).origin + '/collaboration';

export default function CollaborationPresence({ documentId, token }: Props) {
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !documentId) return;
    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 800,
    });

    socket.on('connect', () => {
      setConnected(true);
      setMessage('');
      socket.emit('join-document', { documentId }, (result: { ok?: boolean; message?: string }) => {
        if (!result?.ok) setMessage(result?.message || 'Unable to join live presence.');
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => {
      setConnected(false);
      setMessage('Live presence is reconnecting. Document autosave remains available.');
    });
    socket.on('collaboration-error', (error: { message?: string }) => {
      setMessage(error?.message || 'Live collaboration connection failed.');
    });
    socket.on('presence-updated', (next: Collaborator[]) => {
      setCollaborators(Array.isArray(next) ? next : []);
    });
    socket.on('document-joined', (result: { collaborator?: Collaborator }) => {
      if (result.collaborator) {
        setCollaborators((current) => current.some((person) => person.userId === result.collaborator?.userId)
          ? current
          : [...current, result.collaborator as Collaborator]);
      }
    });

    return () => {
      socket.emit('leave-document', { documentId });
      socket.disconnect();
    };
  }, [documentId, token]);

  return (
    <section className="collaboration-presence" aria-label="Live collaborators">
      <div className="presence-heading">
        <span className={connected ? 'presence-dot presence-online' : 'presence-dot'} />
        <strong>{connected ? 'Live presence' : 'Connecting to team…'}</strong>
        <span className="presence-count">{collaborators.length}</span>
      </div>
      {collaborators.length > 0 ? (
        <ul className="presence-list">
          {collaborators.map((person) => (
            <li key={person.userId}>
              <span className="presence-avatar" aria-hidden="true">
                {person.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'}
              </span>
              <span className="presence-person">
                <strong>{person.displayName}</strong>
                <small>{person.role.toLowerCase()}</small>
              </span>
              <span className="presence-live-label">Online</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="presence-empty">{connected ? 'You are connected. Invite a teammate to see them here.' : 'Trying to connect to live presence.'}</p>
      )}
      {message && <p className="presence-message" role="status">{message}</p>}
    </section>
  );
}
