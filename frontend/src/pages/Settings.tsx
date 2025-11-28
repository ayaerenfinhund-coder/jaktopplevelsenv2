import { useState } from 'react';
import {
  User,
  Database,
  RefreshCw,
  Save,
  Download,
} from 'lucide-react';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  // Garmin
  const [garminEmail, setGarminEmail] = useState('');
  const [autoSync, setAutoSync] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Innstillinger lagret!');
    } catch (error) {
      toast.error('Kunne ikke lagre innstillinger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    toast.success('Eksport av data kommer snart!');
  };

  const handleExportGPX = () => {
    toast.success('Eksport av GPX kommer snart!');
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'garmin', label: 'Garmin', icon: RefreshCw },
    { id: 'data', label: 'Data', icon: Database },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Innstillinger</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidemeny */}
        <nav className="lg:w-64 flex-shrink-0">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === tab.id
                      ? 'bg-primary-700/20 text-primary-400'
                      : 'text-text-secondary hover:bg-background-light'
                    }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Innhold */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">
                Profilinformasjon
              </h2>

              <div className="flex items-center gap-6">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profilbilde"
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary-700"
                  />
                ) : (
                  <div className="w-24 h-24 bg-primary-700 rounded-full flex items-center justify-center text-3xl font-bold text-white">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <p className="text-sm text-text-muted">
                    Profilbildet hentes fra din Google-konto.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Navn</label>
                  <input
                    type="text"
                    value={user?.displayName || ''}
                    disabled
                    className="input opacity-70 cursor-not-allowed"
                  />
                  <p className="input-helper">Hentes fra Google</p>
                </div>
                <div>
                  <label className="input-label">E-post</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input opacity-70 cursor-not-allowed"
                  />
                  <p className="input-helper">Hentes fra Google</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'garmin' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">
                Garmin Alpha-integrasjon
              </h2>

              <div className="p-4 bg-background rounded-lg">
                <p className="text-text-secondary mb-4">
                  Importer hundespor fra din Garmin Alpha 200/200i/300-enhet via
                  Garmin Explore-appen eller direkte GPX-filer.
                </p>

                <div className="space-y-4">
                  <div className="p-3 bg-primary-700/10 border border-primary-700/30 rounded-lg">
                    <h4 className="font-medium text-text-primary mb-2">
                      Slik importerer du spor:
                    </h4>
                    <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
                      <li>Åpne Garmin Explore-appen på mobilen</li>
                      <li>Synkroniser Alpha-enheten via Bluetooth</li>
                      <li>Eksporter hundespor som GPX-fil</li>
                      <li>Last opp GPX-filen nedenfor</li>
                    </ol>
                  </div>

                  <div>
                    <label className="input-label">Last opp GPX-fil</label>
                    <input
                      type="file"
                      accept=".gpx"
                      className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-700 file:text-white file:cursor-pointer"
                      onChange={() => toast.success('GPX-fil mottatt! Spor vil bli importert.')}
                    />
                    <p className="input-helper">
                      Støtter GPX-filer eksportert fra Garmin Explore eller Alpha-appen
                    </p>
                  </div>

                  <div>
                    <label className="input-label">Standard halsbånd-ID</label>
                    <input
                      type="text"
                      value={garminEmail}
                      onChange={(e) => setGarminEmail(e.target.value)}
                      placeholder="F.eks. TT25-12345 eller T20-67890"
                      className="input"
                    />
                    <p className="input-helper">
                      Halsbånd-ID fra din Alpha TT25, T20 eller T5 tracker
                    </p>
                  </div>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="checkbox"
                    />
                    <span className="text-text-secondary">
                      Husk siste importinnstillinger
                    </span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-background rounded-lg">
                <h3 className="font-medium text-text-primary mb-2">
                  Kompatible enheter
                </h3>
                <ul className="text-sm text-text-muted space-y-1">
                  <li>• Garmin Alpha 200/200i/300/300i</li>
                  <li>• Garmin Alpha TT25/T20/T5 halsbånd</li>
                  <li>• Garmin Astro 430/900</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Importer fra fil
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isSaving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Lagre innstillinger
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">
                Data og eksport
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-medium text-text-primary mb-2">
                    Eksporter alle data
                  </h3>
                  <p className="text-sm text-text-muted mb-4">
                    Last ned alle jaktturer, spor og bilder i JSON-format
                  </p>
                  <Button
                    variant="outline"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={handleExportData}
                  >
                    Eksporter data
                  </Button>
                </div>

                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-medium text-text-primary mb-2">
                    Eksporter GPX
                  </h3>
                  <p className="text-sm text-text-muted mb-4">
                    Last ned alle GPS-spor som GPX-filer
                  </p>
                  <Button
                    variant="outline"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={handleExportGPX}
                  >
                    Eksporter GPX
                  </Button>
                </div>

                <div className="p-4 bg-background rounded-lg border border-text-muted/20">
                  <h3 className="font-medium text-text-primary mb-2">
                    Feilsøking
                  </h3>
                  <p className="text-sm text-text-muted mb-4">
                    Hvis du ser gamle testdata eller har problemer, kan du tømme lokal lagring.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('Dette vil logge deg ut og fjerne lokale innstillinger. Er du sikker?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                  >
                    Tøm lokal data
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
