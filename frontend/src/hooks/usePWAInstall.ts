import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        console.log('[PWA] Checking install status...');

        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIOSStandalone = (window.navigator as any).standalone === true;

        if (isStandalone || isIOSStandalone) {
            console.log('[PWA] Already installed');
            setIsInstalled(true);
            return;
        }

        // For development: Always show button if not installed
        // This helps with testing even if beforeinstallprompt doesn't fire
        if (!isInstalled) {
            console.log('[PWA] Not installed, showing install button');
            setIsInstallable(true);
        }

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('[PWA] beforeinstallprompt event fired!');
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        // Listen for successful install
        const handleAppInstalled = () => {
            console.log('[PWA] App installed!');
            setIsInstalled(true);
            setIsInstallable(false);
            setInstallPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!installPrompt) {
            console.log('[PWA] No install prompt available, opening help');
            // Fallback: Show instructions if no native prompt
            alert('For å installere:\n\nChrome: Klikk meny (⋮) → "Installer app"\niOS Safari: Klikk Del → "Legg til på Hjem-skjerm"');
            return false;
        }

        try {
            console.log('[PWA] Showing install prompt...');
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            console.log('[PWA] User choice:', outcome);

            if (outcome === 'accepted') {
                setIsInstallable(false);
                setInstallPrompt(null);
                return true;
            }

            return false;
        } catch (error) {
            console.error('[PWA] Error prompting install:', error);
            return false;
        }
    };

    return {
        isInstallable,
        isInstalled,
        promptInstall
    };
}
