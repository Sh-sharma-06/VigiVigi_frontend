import React, { useState } from 'react';
import CoverHero from './components/CoverHero';
import DashboardView from './components/DashboardView';
import ProjectDetailsModal from './components/ProjectDetailsModal';

export default function App() {
  const [currentView, setCurrentView] = useState('cover'); // 'cover' | 'dashboard'
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <div className="app-container" style={{ background: '#000000', minHeight: '100vh' }}>
      {currentView === 'cover' ? (
        <CoverHero
          onExplore={() => setCurrentView('dashboard')}
          onOpenProjectDetails={() => setIsDetailsOpen(true)}
        />
      ) : (
        <DashboardView
          onBackToCover={() => setCurrentView('cover')}
        />
      )}

      {/* Project Details Modal */}
      <ProjectDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
}
