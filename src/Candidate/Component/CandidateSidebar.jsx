import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  UserPlus,
  Building2,
  X
} from 'lucide-react';

const CandidateAdminSidebar = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState('');

  useEffect(() => {
    const path = location.pathname;

    if (path.includes("/AllJds")) setActiveNav("AllJds");
    else if (path.includes("/AppliedJD")) setActiveNav("AppliedJD");
    else if (path.includes("/Examination")) setActiveNav("Examination");
    else if (path.includes("/Report")) setActiveNav("Reports");
    else setActiveNav("CandidateDashboard");

  }, [location.pathname]);

  const handleNavClick = (name, path) => {
    setActiveNav(name);
    navigate(path);
  };


  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={`
          fixed left-0 top-0 h-screen bg-gray-900 text-white z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 w-64 flex flex-col
        `}
      >
        <div className="flex items-center justify-between py-6 px-7 border-b border-gray-700">
          <h1 className="text-xl font-bold">AIRecruit</h1>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-gray-700 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="py-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">

            <li>
              <button
                onClick={() => handleNavClick('CandidateDashboard', '/Candidate-Dashboard')}
                className={`flex w-full items-center space-x-3 py-2 px-7 rounded transition-colors 
                  ${activeNav === 'CandidateDashboard' ? 'bg-white text-black' : 'hover:bg-white hover:text-black'}`}
              >
                <Home size={20} />
                <span>Dashboard</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => handleNavClick('AllJds', '/Candidate-Dashboard/AllJds')}
                className={`flex w-full items-center space-x-3 py-2 px-7 rounded transition-colors 
                  ${activeNav === 'AllJds' ? 'bg-white text-black' : 'hover:bg-white hover:text-black'}`}
              >
                <Building2 size={20} />
                <span>All Jds</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => handleNavClick('AppliedJD', '/Candidate-Dashboard/AppliedJD')}
                className={`flex w-full items-center space-x-3 py-2 px-7 rounded transition-colors 
                  ${activeNav === 'AppliedJD' ? 'bg-white text-black' : 'hover:bg-white hover:text-black'}`}
              >
                <Building2 size={20} />
                <span>Applied JD</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => handleNavClick('Examination', '/Candidate-Dashboard/Examination')}
                className={`flex w-full items-center space-x-3 py-2 px-7 rounded transition-colors 
                  ${activeNav === 'Examination' ? 'bg-white text-black' : 'hover:bg-white hover:text-black'}`}
              >
                <UserPlus size={20} />
                <span>Examination</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => handleNavClick('Reports', '/Candidate-Dashboard/Report')}
                className={`flex w-full items-center space-x-3 py-2 px-7 rounded transition-colors 
                  ${activeNav === 'Reports' ? 'bg-white text-black' : 'hover:bg-white hover:text-black'}`}
              >
                <UserPlus size={20} />
                <span>Reports</span>
              </button>
            </li>



          </ul>
        </nav>
      </div>
    </>
  );
};

export default CandidateAdminSidebar;
