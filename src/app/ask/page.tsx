'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateQuestion from '../../components/CreateQuestion';

export default function AskPage() {
  const router = useRouter();
  const [showEditor, setShowEditor] = useState(true);

  const handleQuestionCreated = () => {
    router.push('/');
  };

  const handleClose = () => {
    router.push('/');
  };

  return (
    <>
      {showEditor && (
        <CreateQuestion
          onQuestionCreated={handleQuestionCreated}
          onClose={handleClose}
        />
      )}
    </>
  );
} 