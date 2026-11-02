import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { CredentialCard } from '../../components/credentials/CredentialCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { CATEGORIES } from '../../utils/formatUtils';
import { Search, Filter, UploadCloud, Award } from 'lucide-react';

export const MyCredentials = () => {
  const { user } = useAuth();
  const { credentials } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedIssuerStatus, setSelectedIssuerStatus] = useState('ALL');

  const studentCreds = useMemo(() => {
    return credentials.filter(c => c.ownerUserId === user?.id);
  }, [credentials, user]);

  const filteredCredentials = useMemo(() => {
    return studentCreds.filter(cred => {
      const matchesSearch = 
        cred.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cred.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cred.credentialId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cred.issuerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'ALL' || cred.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || cred.credentialStatus === selectedStatus;
      const matchesIssuer = selectedIssuerStatus === 'ALL' || cred.issuerStatus === selectedIssuerStatus;

      return matchesSearch && matchesCategory && matchesStatus && matchesIssuer;
    });
  }, [studentCreds, searchQuery, selectedCategory, selectedStatus, selectedIssuerStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Credentials & Certificates</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your cryptographic evidence records, QR verification codes, and sharing settings.
          </p>
        </div>
        <Link to="/student/upload">
          <Button variant="primary" icon={UploadCloud}>
            Upload New Evidence
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, skill, ID, or issuer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-48 text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Credential Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-36 text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>

          {/* Issuer Trust Status */}
          <select
            value={selectedIssuerStatus}
            onChange={(e) => setSelectedIssuerStatus(e.target.value)}
            className="w-full md:w-40 text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            <option value="ALL">All Issuer States</option>
            <option value="trusted">Trusted Issuer</option>
            <option value="pending">Pending Review</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Showing {filteredCredentials.length} of {studentCreds.length} credentials</span>
          {(searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedIssuerStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSelectedIssuerStatus('ALL');
              }}
              className="text-brand-600 hover:underline font-medium text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Grid of Credentials */}
      {filteredCredentials.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No credentials match your filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or filters, or upload your first verified certificate.
          </p>
          <Link to="/student/upload">
            <Button variant="primary" size="sm" icon={UploadCloud} className="mt-2">
              Upload Evidence
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCredentials.map(cred => (
            <CredentialCard
              key={cred.id}
              credential={cred}
              isStudentOwner={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
