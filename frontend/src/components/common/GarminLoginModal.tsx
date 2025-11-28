import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { apiClient } from '../../services/apiClient';
import toast from 'react-hot-toast';

interface GarminLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GarminLoginModal({ isOpen, onClose, onSuccess }: GarminLoginModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await apiClient.loginGarmin({ email, password });
            toast.success('Koblet til Garmin!');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error('Kunne ikke logge inn på Garmin. Sjekk brukernavn og passord.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Koble til Garmin">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-text-secondary">
                    Logg inn med din Garmin Connect-konto for å synkronisere jaktspor fra din Alpha 200.
                </p>

                <div>
                    <label className="input-label">E-post</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input"
                        required
                        placeholder="din@epost.no"
                    />
                </div>

                <div>
                    <label className="input-label">Passord</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input"
                        required
                        placeholder="Ditt Garmin-passord"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Avbryt
                    </Button>
                    <Button type="submit" variant="primary" isLoading={isLoading}>
                        Logg inn
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
