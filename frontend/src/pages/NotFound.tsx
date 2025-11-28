import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary-700">404</h1>
        </div>
        <h2 className="text-3xl font-bold text-text-primary mb-4">
          Siden ble ikke funnet
        </h2>
        <p className="text-text-muted max-w-md mx-auto mb-8">
          Beklager, vi kunne ikke finne siden du leter etter. Den kan ha blitt
          flyttet eller slettet.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/">
            <Button variant="primary" size="lg" leftIcon={<Home className="w-5 h-5" />}>
              Gå til forsiden
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="lg"
            leftIcon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => window.history.back()}
          >
            Gå tilbake
          </Button>
        </div>
      </div>
    </div>
  );
}
