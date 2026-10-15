import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  IconNetwork,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconMinus,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react';

interface OrgNode {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  jobTitle: string;
  reports?: OrgNode[];
}

// ---------------------------------------------------------------------------
// Top-Down Flowchart Node Component
// ---------------------------------------------------------------------------
interface FlowchartNodeProps {
  node: OrgNode;
  isRoot?: boolean;
  searchQuery?: string;
}

const FlowchartNode: React.FC<FlowchartNodeProps> = ({ node, searchQuery = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = Boolean(node.reports && node.reports.length > 0);

  const initials = `${node.firstName?.[0] || ''}${node.lastName?.[0] || ''}`.toUpperCase();
  const isMatch =
    searchQuery.trim().length > 0 &&
    (`${node.firstName} ${node.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.role?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col items-center select-none">
      {/* Node Card */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={`w-64 bg-white rounded-2xl border-2 transition-all p-4 shadow-sm hover:shadow-md text-left ${
            isMatch
              ? 'border-[#5452f6] ring-4 ring-[#5452f6]/20 scale-105'
              : hasChildren
              ? 'border-indigo-200 hover:border-[#5452f6]'
              : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#5452f6] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {initials || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-sm truncate">
                  {node.firstName} {node.lastName}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 uppercase tracking-tight">
                  {node.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5 leading-snug">
                {node.jobTitle || 'Team Member'}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{node.email}</p>
            </div>
          </div>

          {/* Direct Reports Expand Button */}
          {hasChildren && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 w-full py-1.5 bg-indigo-50/70 hover:bg-indigo-100/90 text-[#5452f6] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>
                {node.reports!.length} {node.reports!.length === 1 ? 'Direct Report' : 'Direct Reports'}
              </span>
              {isExpanded ? (
                <IconChevronUp className="w-3.5 h-3.5" />
              ) : (
                <IconChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Stem leaving bottom of this card if children are visible */}
        {hasChildren && isExpanded && <div className="w-0.5 h-7 bg-indigo-300" />}
      </div>

      {/* Children Tier with Orthogonal Flowchart Connector Lines */}
      {hasChildren && isExpanded && (
        <div className="relative flex justify-center gap-8 sm:gap-12 pt-0">
          {node.reports!.map((child, idx) => {
            const count = node.reports!.length;
            const isFirst = idx === 0;
            const isLast = idx === count - 1;
            const isOnly = count === 1;

            return (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Crossbar slice connecting horizontally */}
                {!isOnly && (
                  <div
                    className={`absolute top-0 h-0.5 bg-indigo-300 ${
                      isFirst
                        ? 'left-1/2 right-0'
                        : isLast
                        ? 'left-0 right-1/2'
                        : 'left-0 right-0'
                    }`}
                  />
                )}

                {/* Vertical drop line down into child node */}
                <div className="w-0.5 h-7 bg-indigo-300" />

                {/* Child Branch */}
                <FlowchartNode node={child} searchQuery={searchQuery} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export const OrgStructurePage: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<OrgNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOrg = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/org-structure');
      const fetched = res.data?.hierarchy || [];

      if (fetched.length === 0) {
        setHierarchy([
          {
            id: 1,
            firstName: 'Alex',
            lastName: 'Vance',
            email: 'admin@acme.com',
            role: 'COMPANY_ADMIN',
            jobTitle: 'Chief Executive Officer',
          },
          {
            id: 2,
            firstName: 'Rachel',
            lastName: 'Green',
            email: 'hr@acme.com',
            role: 'HR',
            jobTitle: 'HR Director',
          },
          {
            id: 3,
            firstName: 'David',
            lastName: 'Miller',
            email: 'manager@acme.com',
            role: 'EMPLOYEE',
            jobTitle: 'Engineering Manager',
            reports: [
              {
                id: 4,
                firstName: 'Sarah',
                lastName: 'Connor',
                email: 'employee@acme.com',
                role: 'EMPLOYEE',
                jobTitle: 'Senior Full Stack Engineer',
              },
              {
                id: 5,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@acme.com',
                role: 'EMPLOYEE',
                jobTitle: 'Associate Software Engineer',
              },
            ],
          },
        ]);
      } else {
        setHierarchy(fetched);
      }
    } catch (err) {
      console.error('Failed to load org hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, []);

  // Build a unified corporate flowchart tree rooted at the CEO
  const flowchartTree = useMemo<OrgNode | null>(() => {
    if (hierarchy.length === 0) return null;

    // Look for top executive (COMPANY_ADMIN or CEO)
    const ceoIndex = hierarchy.findIndex(
      (n) =>
        n.role === 'COMPANY_ADMIN' ||
        n.jobTitle?.toLowerCase().includes('ceo') ||
        n.jobTitle?.toLowerCase().includes('chief executive')
    );

    const ceoNode = ceoIndex >= 0 ? hierarchy[ceoIndex] : hierarchy[0];
    const otherRoots = hierarchy.filter((_, idx) => (ceoIndex >= 0 ? idx !== ceoIndex : idx !== 0));

    // Combine existing reports with other root-level department managers
    const mergedReports = [...(ceoNode.reports || [])];
    for (const other of otherRoots) {
      if (!mergedReports.some((m) => m.id === other.id)) {
        mergedReports.push(other);
      }
    }

    return {
      ...ceoNode,
      reports: mergedReports,
    };
  }, [hierarchy]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#eeeffd] text-[#5452f6] flex items-center justify-center shrink-0 shadow-2xs">
          <IconNetwork className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Org Structure
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Interactive reporting structure from executive leadership down to functional squad teams.
          </p>
        </div>
      </div>

      {/* Toolbar: Search & Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee in org chart..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5452f6] transition-all"
          />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
              className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <IconMinus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors cursor-pointer"
              title="Reset Zoom"
            >
              <IconRefresh className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
              className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <IconPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Flowchart Canvas Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs min-h-[580px] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-8 space-y-6 animate-pulse">
            <div className="w-64 h-24 bg-slate-100 rounded-2xl mx-auto" />
            <div className="flex justify-center gap-12">
              <div className="w-64 h-24 bg-slate-100 rounded-2xl" />
              <div className="w-64 h-24 bg-slate-100 rounded-2xl" />
            </div>
          </div>
        ) : hierarchy.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <IconNetwork className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No organization hierarchy nodes found.</p>
          </div>
        ) : (
          /* Flowchart Canvas with Pan/Scroll and Zoom Transform */
          <div className="flex-1 overflow-x-auto overflow-y-auto p-8 sm:p-12 flex justify-center items-start min-w-full">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="py-4"
            >
              {flowchartTree && <FlowchartNode node={flowchartTree} searchQuery={searchQuery} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgStructurePage;
