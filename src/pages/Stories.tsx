import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';

export default function Stories() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to messages page since stories are now in the conversations tab
    navigate('/', { replace: true });
  }, [navigate]);

  return (
    <MainLayout title="Atualizações">
      <div className="flex items-center justify-center h-96 p-6 text-center">
        <p className="text-muted-foreground">
          Redirecionando para conversas...
        </p>
      </div>
    </MainLayout>
  );
}
