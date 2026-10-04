import { useState } from 'react';

import { emptyEventInput, EventForm } from '@/components/event-form';
import { createEvent } from '@/lib/events';
import { closeModal } from '@/lib/navigation';

export default function NewEventScreen() {
  const [initial] = useState(emptyEventInput);

  return (
    <EventForm
      title="Nuevo evento"
      initial={initial}
      onCancel={closeModal}
      onSubmit={async (input) => {
        await createEvent(input);
        closeModal();
      }}
    />
  );
}
