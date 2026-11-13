import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { 
  Building2, 
  Award, 
  FileCheck2, 
  ShieldCheck, 
  Clock, 
  UploadCloud, 
  ExternalLink,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { walletService } from '../../services/walletService';
import toast from 'react-hot-toast';

export const IssuerDashboard = () => {
  const { user } = useAuth();
  const { issuers, credentials } = useApp();

  const [walletState, setWalletState] = useState({
    account: walletService.getConnectedAccount(),
    chainId: walletService.getChainId(),
    isSepolia: walletService.isSepoliaNetwork(),
    isAvailable: walletService.isMetaMaskAvailable(),
  });
  const [connecting, setConnecting] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const unsubscribe = walletService.subscribe(setWalletState);
    return () => unsubscribe();
  }, []);

  const handleConnectWallet = async () => {
    setConnecting(true);
    try {
      const res = await walletService.connect();
      toast.success(`Connected to MetaMask: ${res.address.slice(0, 6)}...${res.address.slice(-4)}`);
    } catch (err) {
      toast.error(err.message || 'Failed to connect MetaMask');
    } finally {
      setConnecting(false);
    }
  };

  const handleLinkWallet = async () => {
    setLinking(true);
    try {
      const res = await walletService.linkInstitutionalWallet();
      toast.success('MetaMask wallet verified and securely linked to institution account!');
    } catch (err) {
      toast.error(err.message || 'Wallet verification failed');
    } finally {
      setLinking(false);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await walletService.switchToSepolia();
      toast.success('Switched to Ethereum Sepolia network');
    } catch (err) {
      toast.error('Failed to switch network: ' + err.message);
    }
  };

  const handleDisconnect = () => {
    walletService.disconnect();
    toast.success('MetaMask disconnected from session');
  };

  const myIssuer = issuers.find(i => i.id === user?.issuerId || i.email === user?.email) || issuers[0];
  const issuedCreds = credentials.filter(c => c.issuerId === myIssuer?.id || c.issuerName === myIssuer?.organizationName);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-brand-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-300">
              Accredited Issuing Authority Portal
            </span>
            <Badge status={myIssuer?.trustStatus || 'trusted'} size="sm" />
          </div>
          <h1 className="text-2xl font-extrabold mt-1">{myIssuer?.organizationName}</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {myIssuer?.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/issuer/issue">
            <Button variant="primary" icon={UploadCloud}>
              Issue Credential
            </Button>
          </Link>
          <Link to="/issuer/requests">
            <Button variant="secondary" icon={FileCheck2}>
              Review Claims
            </Button>
          </Link>
        </div>
      </div>

      {/* Institutional MetaMask Blockchain Wallet Card */}
      <Card className="p-5 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 via-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Institutional MetaMask Signing Wallet</h3>
                {walletState.account ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                    Not Connected
                  </span>
                )}
                {walletState.account && (
                  walletState.isSepolia ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
                      Ethereum Sepolia (11155111)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                      <AlertTriangle className="w-3 h-3" /> Unsupported Network
                    </span>
                  )
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {walletState.account ? (
                  <>
                    Active Wallet: <span className="font-mono font-medium text-slate-800">{walletState.account}</span>
                    <a
                      href={`https://sepolia.etherscan.io/address/${walletState.account}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center text-brand-600 hover:underline text-[11px]"
                    >
                      Etherscan <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </>
                ) : (
                  'Connect institutional MetaMask wallet to authorize on-chain credential issuance with EIP-712 signatures.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!walletState.account ? (
              <Button
                variant="primary"
                size="sm"
                icon={Wallet}
                onClick={handleConnectWallet}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : 'Connect MetaMask'}
              </Button>
            ) : (
              <>
                {!walletState.isSepolia && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RefreshCw}
                    onClick={handleSwitchNetwork}
                  >
                    Switch to Sepolia
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ShieldCheck}
                  onClick={handleLinkWallet}
                  disabled={linking}
                >
                  {linking ? 'Verifying...' : 'Verify & Link Wallet'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={LogOut}
                  onClick={handleDisconnect}
                  title="Disconnect Wallet"
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Issued Credentials</span>
            <Award className="w-5 h-5 text-brand-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{issuedCreds.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Attested & registered</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Accreditation Trust</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-600 mt-2 capitalize">{myIssuer?.trustStatus}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Platform verified charter</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Validation Claims</span>
            <FileCheck2 className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">1</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Student claims pending review</span>
        </Card>
      </div>

      {/* Issued Credentials Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recently Attested Credentials</h3>
            <p className="text-xs text-slate-500">Credentials backed by {myIssuer?.organizationName}</p>
          </div>
          <Link to="/issuer/credentials">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Credential ID & Title</th>
                <th className="py-3 px-4">Skill Domain</th>
                <th className="py-3 px-4">Hash Algorithm</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issuedCreds.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{c.title}</p>
                    <span className="font-mono text-[11px] text-brand-600 font-medium">{c.credentialId}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{c.skillName}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{c.fileHashAlgorithm}</td>
                  <td className="py-3.5 px-4"><Badge status={c.credentialStatus} size="sm" /></td>
                  <td className="py-3.5 px-4 text-right">
                    <Link to={`/verify/${c.credentialId}`} target="_blank">
                      <Button variant="ghost" size="sm" icon={ExternalLink}>Verify</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
