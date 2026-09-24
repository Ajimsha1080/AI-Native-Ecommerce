'use client';

import React, { use } from 'react';
import ConversationsWorkspacePage from '../page';

export default function SingleConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  return <ConversationsWorkspacePage />;
}
