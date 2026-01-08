// import { useEffect, useState, useRef } from 'react';
// import { Trash2, Search, SlidersHorizontal, Eye } from 'lucide-react';
// import Pagination from '../../components/LandingPage/Pagination';
// import SpinLoader from '../../components/SpinLoader';

// function Report() {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [openModal, setOpenModal] = useState(false);
//   const [selectedCandidate, setSelectedCandidate] = useState(null);
//   const [candidates, setCandidates] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const mountedRef = useRef(true);
//   const itemsPerPage = 5;
//   const CAND_API_BASE = window.REACT_APP_BASE_URL || 'http://localhost:4000';

//   const handleDelete = async (attempt) => {
//     if (!attempt || !attempt.id) return;
//     const ok = window.confirm(`Delete attempt ${attempt.id}? This cannot be undone.`);
//     if (!ok) return;
//     try {
//       const base = window.REACT_APP_BASE_URL || 'http://localhost:5000';
//       const res = await fetch(`${base}/api/v1/test/attempts/${encodeURIComponent(attempt.id)}`, { method: 'DELETE' });
//       if (!res.ok) {
//         const txt = await res.text();
//         alert('Delete failed: ' + txt);
//         return;
//       }
//       setCandidates(prev => prev.filter(c => c.id !== attempt.id));
//     } catch (e) {
//       console.error('Delete failed', e);
//       alert('Delete failed');
//     }
//   };

//   // Fetch attempts from backend and map to UI shape
//   const loadAttempts = async () => {
//     setError(null);
//     setLoading(true);
//     try {
//       const res = await fetch('http://localhost:5000/api/v1/test/attempts');
//       if (!res.ok) {
//         const txt = await res.text().catch(() => 'Failed');
//         throw new Error(txt || 'Failed loading attempts');
//       }
//       const data = await res.json();
//       console.log("DATA:",data)
//       const mapped = (data.attempts || []).map(a => ({
//           id: a.id || a.candidate_id || '—',
//           // store candidate id so we can lookup canonical name from backend
//           candidateId: a.candidate_id || a.details?.candidate_id || null,
//           // preserve cid from attempt row for public lookup
//           cid: a.cid ?? a.details?.cid ?? null,
//           // will be replaced by server lookup below when possible
//           name: 'Candidate',
//           email: '',
//           company: a.details?.company || '-',
//           jobTitle: a.details?.role_title || '-',
//           totalQuestion: Array.isArray(a.results_data) ? a.results_data.length : '-',
//           // compute marks from results_data.score when available
//           marks: (Array.isArray(a.results_data) && a.results_data.length) ? (() => {
//             try {
//               let obtained = 0;
//               let possible = 0;
//               for (const q of a.results_data) {
//                 if (!q) continue;
//                 const hasScoreField = q.score !== undefined && q.score !== null;
//                 const scoreVal = hasScoreField ? Number(q.score || 0) : null;
//                 const posMark = (q.positive_marking !== undefined && q.positive_marking !== null) ? Number(q.positive_marking) : null;
//                 const negMark = (q.negative_marking !== undefined && q.negative_marking !== null) ? Number(q.negative_marking) : null;

//                 if (scoreVal !== null) {
//                   obtained += scoreVal;
//                 } else if (posMark !== null) {
//                   // derive from raw_score/is_correct when score absent
//                   if (q.is_correct) {
//                     obtained += posMark;
//                   } else if (negMark !== null) {
//                     obtained -= Math.abs(negMark);
//                   }
//                 } else if (q.raw_score !== undefined && q.raw_score !== null) {
//                   // best-effort: assume raw_score in [0,1]
//                   const raw = Number(q.raw_score) || 0;
//                   obtained += raw;
//                 }

//                 if (posMark !== null) possible += posMark;
//                 else if (q.max_score !== undefined && q.max_score !== null) possible += Number(q.max_score);
//                 else possible += 1;
//               }
//               return `${obtained}/${possible}`;
//             } catch (e) { return '-'; }
//           })() : '-',
//           skills: Array.isArray(a.details?.skills) ? a.details.skills : (a.details?.skills || []),
//           time: '-',
//           correct: '-',
//           incorrect: '-',
//           raw: a,
//         }));
//       if (mountedRef.current) setCandidates(mapped);

//         // Try to resolve candidate names by calling candidate API route for each candidate_id
//         try {
//           // Prefer same API base as other calls (backend main API)
//           const CAND_API_BASE = window.REACT_APP_BASE_URL || 'http://localhost:4000';
//           const token = localStorage.getItem('candidateToken') || localStorage.getItem('token') || null;
//           console.log("token",token)

//           const fetchName = async (candidateId) => {
//             if (!candidateId) return null;
//             try {
//               const headers = { 'Content-Type': 'application/json' };
//               if (token) headers['Authorization'] = `Bearer ${token}`;
//               const r = await fetch(`${CAND_API_BASE}/api/candidate/public/${encodeURIComponent(candidateId)}`, { headers });
//               if (!r.ok) return null;
//               const j = await r.json();
//               return j.candidate?.name || null;
//             } catch (e) { return null; }
//           };

//           const promises = mapped.map(async (m) => {
//             const cid = m.cid ?? m.candidateId ?? m.raw?.candidate_id ?? null;
//             if (cid) {
//               try {
//                 const headers = { 'Content-Type': 'application/json' };
//                 if (token) headers['Authorization'] = `Bearer ${token}`;
//                 const r = await fetch(`${CAND_API_BASE}/api/candidate/public/${encodeURIComponent(cid)}`, { headers });
//                 if (r.ok) {
//                   const j = await r.json();
//                   const name = j.candidate?.name || j.name || null;
//                   if (name) m.name = name;
//                   m.email = j.candidate?.email || j.email || m.email || '';
//                 }
//               } catch (e) {
//                 // ignore per-candidate failures
//               }
//             }

//             // also fetch assessment metadata (title/role) from main API and use it as jobTitle when available
//             try {
//               const qset = m.raw?.question_set_id || m.raw?.questionSetId || m.raw?.question_setId || null;
//               if (qset) {
//                 const API_ROOT = (window.REACT_APP_BASE_URL || 'http://localhost:5000').replace(/\/$/, '') + '/api/v1';
//                 try {
//                   const ar = await fetch(`${API_ROOT}/question-set/${encodeURIComponent(qset)}/assessment`);
//                   if (ar.ok) {
//                     const aj = await ar.json();
//                     if (aj && aj.status === 'success') {
//                       m.jobTitle = aj.role_title || aj.title || m.jobTitle;
//                       m.company = aj.company || m.company;
//                     }
//                   }
//                 } catch (e) {
//                   // ignore assessment fetch failures
//                 }
//               }
//             } catch (e) {
//               // ignore
//             }

//             return m;
//           });

//       const resolved = await Promise.all(promises);
//       if (mountedRef.current) setCandidates(resolved);
//     } catch (e) {
//       console.warn('Candidate name resolution failed', e);
//     }
//     } catch (err) {
//       console.error('Failed loading attempts', err);
//       setError((err && err.message) ? String(err.message) : 'Failed loading attempts');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     mountedRef.current = true;
//     loadAttempts();
//     return () => { mountedRef.current = false };
//   }, []);

//   const retryLoad = () => {
//     setError(null);
//     loadAttempts();
//   };

//   const filteredCandidates = candidates.filter((c) =>
//     (c.name || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const currentData = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

//   useEffect(() => {
//     if (!openModal) return;
//     const onKey = (e) => {
//       if (e.key === 'Escape') {
//         setOpenModal(false);
//         setSelectedCandidate(null);
//       }
//     };
//     document.addEventListener('keydown', onKey);
//     return () => document.removeEventListener('keydown', onKey);
//   }, [openModal]);

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
//       <div className={`${loading ? 'filter blur-sm pointer-events-none' : ''} max-w-7xl mx-auto` }>
//       <div className="flex flex-col sm:flex-row justify-between items-stretch gap-6 mb-8">
//         <div className="flex flex-col gap-3 p-3 rounded-lg w-[290px] border border-gray-300 shadow-md">
//           <span className="font-medium text-3xl">Selected Candidate</span>
//           <span className="text-4xl">1234</span>
//         </div>
//         <div className="flex flex-col gap-3 p-3 rounded-lg w-[290px] border border-gray-300 shadow-md">
//           <span className="font-medium text-3xl">Failed Candidate</span>
//           <span className="text-4xl">1234</span>
//         </div>
//       </div>

//       <div className="bg-white rounded-xl shadow-md border border-gray-300 p-4 md:p-6 mb-8">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
//           <h2 className="text-xl font-semibold text-gray-800">Candidates</h2>

//           <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:justify-end">
//             <div className="relative w-full sm:w-64">
//               <input
//                 type="text"
//                 placeholder="Search by Name"
//                 value={searchTerm}
//                 onChange={(e) => {
//                   setSearchTerm(e.target.value);
//                   setCurrentPage(1);
//                 }}
//                 className="w-full pl-3 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               />
//               <button className="absolute right-0 top-0 h-full px-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
//                 <Search className="w-5 h-5" />
//               </button>
//             </div>

//             <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white rounded-lg transition-colors hover:bg-gray-800 w-full sm:w-auto">
//               <SlidersHorizontal className="w-5 h-5" />
//               <span className="font-medium text-sm">Filter</span>
//             </button>
//           </div>
//         </div>

//         <div className="overflow-x-auto border border-gray-200 shadow-md rounded-2xl">
//           <table className="w-full min-w-[700px]">
//             <thead>
//               <tr className="border-b border-gray-300 bg-gray-50">
//                 <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
//                 <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Name</th>
//                 <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Job Title</th>
//                 <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Total Question</th>
//                 <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Marks</th>
//                 <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {currentData.length > 0 ? (
//                 currentData.map((candidate, index) => (
//                   <tr
//                     key={index}
//                     className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
//                   >
//                     <td className="py-4 px-4 text-sm text-gray-800">{candidate.id}</td>
//                     <td className="py-4 px-4 text-sm text-gray-600">{candidate.name}</td>
//                     <td className="py-4 px-4 text-sm text-gray-600">{candidate.jobTitle}</td>
//                     <td className="py-4 px-4 text-sm text-gray-600">{candidate.totalQuestion}</td>
//                     <td className="py-4 px-4 text-sm text-gray-600">{candidate.marks}</td>
//                     <td className="py-4 px-4 space-x-2">
//                       <button
//                         onClick={async () => {
//                           // build richer selectedCandidate before opening modal
//                           const enriched = { ...candidate };
//                           // try to fetch canonical name if it's missing or placeholder
//                           if ((!enriched.name || enriched.name === 'Candidate') && enriched.candidateId) {
//                               try {
//                               const candidateCid = enriched.cid ?? enriched.raw?.cid ?? enriched.candidateId ?? null;
//                               if (candidateCid) {
//                                 const r = await fetch(`${CAND_API_BASE}/api/candidate/public/${encodeURIComponent(candidateCid)}`);
//                                 if (r.ok) {
//                                   const j = await r.json();
//                                   enriched.name = j.candidate?.name || j.name || enriched.name;
//                                   enriched.email = j.candidate?.email || j.email || enriched.email;
//                                 }
//                               }
//                             } catch (e) { /* ignore */ }
//                           }
//                           // compute additional derived fields from raw attempt if available
//                               try {
//                                 const raw = enriched.raw || {};
//                                 // If qa_data exists, merge answers into results_data entries when missing
//                                 try {
//                                   // Use results_data as authoritative source for answers (ignore qa_data)
//                                   const sourceList = raw.results_data || raw.resultsData || [];
//                                   if (Array.isArray(sourceList)) {
//                                     sourceList.forEach(r => {
//                                       try {
//                                         // Prefer existing given_answer, otherwise fall back to candidate_answer or answer
//                                         const cand = r.candidate_answer ?? r.candidateAnswer ?? r.candidateResponse ?? null;
//                                         const ans = r.answer ?? r.correct_answer ?? null;
//                                         if ((r.given_answer === undefined || r.given_answer === null || String(r.given_answer).trim() === '') &&
//                                             cand !== null && String(cand).trim() !== '') {
//                                           r.given_answer = cand;
//                                         }
//                                         if ((r.given_answer === undefined || r.given_answer === null || String(r.given_answer).trim() === '') &&
//                                             ans !== null && String(ans).trim() !== '') {
//                                           r.given_answer = ans;
//                                         }
//                                         // normalize other fields
//                                         r.answer = r.answer ?? r.given_answer ?? r.candidate_answer ?? null;
//                                         r.candidate_answer = r.candidate_answer ?? r.given_answer ?? r.answer ?? null;
//                                       } catch (e) {
//                                         // ignore normalization errors
//                                       }
//                                     });
//                                   }
//                                 } catch (e) {
//                                   // ignore merge errors
//                                 }

//                                 enriched.totalQuestion = Array.isArray(raw.results_data) ? raw.results_data.length : enriched.totalQuestion;
//                             // derive marks: accumulate `score` when present, otherwise use positive/negative marking
//                             if (Array.isArray(raw.results_data)) {
//                               try {
//                                 let obtained = 0;
//                                 let possible = 0;
//                                 for (const q of raw.results_data) {
//                                   if (!q) continue;
//                                   const hasScoreField = q.score !== undefined && q.score !== null;
//                                   const scoreVal = hasScoreField ? Number(q.score || 0) : null;
//                                   const posMark = (q.positive_marking !== undefined && q.positive_marking !== null) ? Number(q.positive_marking) : null;
//                                   const negMark = (q.negative_marking !== undefined && q.negative_marking !== null) ? Number(q.negative_marking) : null;

//                                   if (scoreVal !== null) {
//                                     obtained += scoreVal;
//                                   } else if (posMark !== null) {
//                                     if (q.is_correct) obtained += posMark;
//                                     else if (negMark !== null) obtained -= Math.abs(negMark);
//                                   } else if (q.raw_score !== undefined && q.raw_score !== null) {
//                                     obtained += Number(q.raw_score) || 0;
//                                   }

//                                   if (posMark !== null) possible += posMark;
//                                   else if (q.max_score !== undefined && q.max_score !== null) possible += Number(q.max_score);
//                                   else possible += 1;
//                                 }
//                                 enriched.marks = `${obtained}/${possible}`;
//                                 enriched.correct = raw.results_data.filter(r => r && r.is_correct).length || undefined;
//                                 enriched.incorrect = Array.isArray(raw.results_data) ? raw.results_data.length - (enriched.correct || 0) : undefined;
//                               } catch (e) { /* ignore */ }
//                             }
//                             enriched.time = raw.time_taken || enriched.time;
//                           } catch (e) { /* ignore */ }

//                           setSelectedCandidate(enriched);
//                           setOpenModal(true);
//                         }}
//                         className="p-1.5 border border-blue-300 rounded hover:bg-blue-50"
//                         aria-label="View Result"
//                       >
//                         <Eye size={16} className="text-blue-500" />
//                       </button>
//                       <button onClick={() => handleDelete(candidate)} className="p-1.5 border border-red-300 rounded hover:bg-red-50" aria-label="Delete">
//                         <Trash2 size={16} className="text-red-600" />
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="6" className="py-6 text-center text-gray-500">
//                     No candidates found
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>

//           {totalPages > 1 && (
//             <Pagination
//               currentPage={currentPage}
//               totalPages={totalPages}
//               onPageChange={(newPage) => {
//                 if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
//               }}
//             />
//           )}
//         </div>
//       </div>

//       {openModal && selectedCandidate && (
//         <div
//           role="dialog"
//           aria-modal="true"
//           className="fixed inset-0 z-[100] flex items-start justify-center overflow-auto p-4 sm:p-6 bg-black/40"
//           onClick={() => {
//             setOpenModal(false);
//             setSelectedCandidate(null);
//           }}
//         >
//           <div
//             className="relative w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <button
//               aria-label="Close"
//               onClick={() => {
//                 setOpenModal(false);
//                 setSelectedCandidate(null);
//               }}
//               className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>

//             <div className="p-4 sm:p-6 lg:p-8">
//               <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
//                 <section className="col-span-1 rounded-xl border border-gray-200 p-4 sm:p-6 lg:col-span-2">
//                   <div className="space-y-3 sm:space-y-4">
//                     <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
//                       <span className="min-w-[120px] text-gray-600">ID</span>
//                       <span className="font-medium text-gray-900">{selectedCandidate.id}</span>
//                     </div>
                    
//                     <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
//                       <span className="min-w-[120px] text-gray-600">Name</span>
//                       <span className="font-medium text-gray-900">{selectedCandidate.name}</span>
//                     </div>
                    
//                     <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
//                       <span className="min-w-[120px] text-gray-600">Job Title</span>
//                       <span className="font-medium text-gray-900">{selectedCandidate.jobTitle}</span>
//                     </div>
                    
//                     <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
//                       <span className="min-w-[120px] text-gray-600">Total Questions</span>
//                       <span className="font-medium text-gray-900">{selectedCandidate.totalQuestion} Questions</span>
//                     </div>
                    
//                     <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
//                       <span className="min-w-[120px] text-gray-600">Marks</span>
//                       <span className="font-semibold text-green-600">
//                         {selectedCandidate.marks ? selectedCandidate.marks.split('/')[0] : 0}/{selectedCandidate.marks ? selectedCandidate.marks.split('/')[1] : 0}
//                       </span>
//                     </div>

//                     <div className="flex flex-wrap items-start gap-2">
//                       <span className="min-w-[120px] text-gray-600">Skills</span>
//                       <div className="flex flex-wrap gap-2">
//                         {(Array.isArray(selectedCandidate.skills) && selectedCandidate.skills.length ? selectedCandidate.skills : ['Wireframing', 'Prototyping', 'User Research']).map((s, i) => (
//                           <span key={`${s}-${i}`} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
//                             {s}
//                           </span>
//                         ))}
//                       </div>
//                     </div>

//                     <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
//                       <span className="min-w-[120px] text-gray-600">Correct Answer</span>
//                       <span className="font-medium text-gray-900">{selectedCandidate.correct ?? '—'}</span>
//                     </div>
                    
//                     <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
//                       <span className="min-w-[120px] text-gray-600">Incorrect Answer</span>
//                       <span className="font-medium text-gray-900">{selectedCandidate.incorrect ?? '—'}</span>
//                     </div>

//                     <div className="pt-4">
//                       <h3 className="text-sm font-medium text-gray-700">Attempt Details</h3>
//                       <div className="mt-2 max-h-48 overflow-auto text-sm bg-gray-50 p-2 rounded">
//                         {selectedCandidate.raw?.results_data && Array.isArray(selectedCandidate.raw.results_data) ? (
//                           <table className="w-full text-left text-xs">
//                             <thead>
//                               <tr className="text-gray-600">
//                                 <th className="py-1 px-2">#</th>
//                                 <th className="py-1 px-2">Question</th>
//                                 <th className="py-1 px-2">Given Answer</th>
//                                 <th className="py-1 px-2">Correct?</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {selectedCandidate.raw.results_data.map((r, i) => (
//                                 <tr key={i} className="odd:bg-white even:bg-gray-100">
//                                   <td className="py-1 px-2 align-top">{i + 1}</td>
//                                   <td className="py-1 px-2 align-top">{r.question || r.q_text || '-'} </td>
//                                   <td className="py-1 px-2 align-top">{r.given_answer ?? r.answer ?? '-'}</td>
//                                   <td className="py-1 px-2 align-top">{r.is_correct ? 'Yes' : 'No'}</td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         ) : (
//                           <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(selectedCandidate.raw || {}, null, 2)}</pre>
//                         )}
//                       </div>
//                     </div>

//                     <div className="pt-2">
//                       <div className="mb-2 flex items-center gap-2">
//                         <span className="text-gray-700">Percentage</span>
//                         <span className="font-semibold text-green-600">
//                           {(() => {
//                             const scored = Number(selectedCandidate.marks?.split('/')[0]) || 0;
//                             const max = Number(selectedCandidate.marks?.split('/')[1]) || 0;
//                             return max ? Math.round((scored / max) * 100) : 0;
//                           })()}%
//                         </span>
//                       </div>
//                       <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
//                         <div 
//                           className="h-full rounded-full bg-green-500" 
//                           style={{ 
//                             width: `${(() => {
//                               const scored = Number(selectedCandidate.marks?.split('/')[0]) || 0;
//                               const max = Number(selectedCandidate.marks?.split('/')[1]) || 0;
//                               return max ? Math.round((scored / max) * 100) : 0;
//                             })()}%` 
//                           }} 
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 </section>

//                 <aside className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
//                   <div className="rounded-xl border border-gray-200 p-4 sm:p-6">
//                     <p className="text-base font-semibold text-gray-800">Total Marks</p>
//                     <p className="mt-2 text-4xl font-extrabold tracking-tight text-blue-600 sm:text-5xl">
//                       {selectedCandidate.marks ? `${selectedCandidate.marks.split('/')[0]}/${selectedCandidate.marks.split('/')[1]}` : '0/0'}
//                     </p>
//                   </div>

//                   <div className="rounded-xl border border-gray-200 p-4 sm:p-6">
//                     <p className="text-base font-semibold text-gray-800">Total Questions</p>
//                     <p className="mt-2 text-4xl font-extrabold tracking-tight text-blue-600 sm:text-5xl">
//                       {selectedCandidate.totalQuestion ?? '-'}
//                     </p>
//                   </div>
//                 </aside>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Loading overlay (match Results.jsx) */}
//       {loading && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//           <div className="bg-white/90 rounded-lg p-6 flex flex-col items-center gap-3">
//             <SpinLoader />
//             <div className="text-sm text-gray-700">Loading tests...</div>
//           </div>
//         </div>
//       )}

//       {/* Error fallback */}
//       {error && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-4">
//           <div className="max-w-lg w-full bg-white rounded-lg p-6 shadow">
//             <h3 className="text-lg font-semibold mb-2">Failed to load data</h3>
//             <p className="text-sm text-gray-600 mb-4">{String(error)}</p>
//             <div className="flex gap-2">
//               <button onClick={retryLoad} className="px-3 py-2 bg-blue-600 text-white rounded">Retry</button>
//               <button onClick={() => setError(null)} className="px-3 py-2 bg-gray-100 rounded">Dismiss</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   </div>
//   );
// }

// export default Report;


import { useEffect, useState, useRef } from 'react';
import { Trash2, Search, SlidersHorizontal, Eye } from 'lucide-react';
import Pagination from '../../components/LandingPage/Pagination';
import SpinLoader from '../../components/SpinLoader';
import { baseUrl } from '../../utils/ApiConstants';

function Report() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const itemsPerPage = 5;
  const CAND_API_BASE = window.REACT_APP_BASE_URL || `${baseUrl}`;

  const handleDelete = async (attempt) => {
    if (!attempt || !attempt.id) return;
    const ok = window.confirm(`Delete attempt ${attempt.id}? This cannot be undone.`);
    if (!ok) return;
    try {
      const base = window.REACT_APP_BASE_URL || `${baseUrl}`;
      const res = await fetch('https://python-k0xt.onrender.com/api/v1/test/attempts/${encodeURIComponent(attempt.id)}', { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        alert('Delete failed: ' + txt);
        return;
      }
      setCandidates(prev => prev.filter(c => c.id !== attempt.id));
    } catch (e) {
      console.error('Delete failed', e);
      alert('Delete failed');
    }
  };

  // Fetch attempts from backend and map to UI shape
  const loadAttempts = async () => {
    setError(null);
    setLoading(true);
    // determine if a candidate is logged in and get their canonical id (cid)
    const candidateRaw = sessionStorage.getItem('candidateData') || localStorage.getItem('candidateData') || localStorage.getItem('candidate');
    let loggedCid = null;
    if (candidateRaw) {
      try {
        const parsed = JSON.parse(candidateRaw);
        loggedCid = parsed?.cid || parsed?.id || parsed?._id || parsed?.candidate_id || null;
      } catch (e) {
        loggedCid = null;
      }
    }
    const restrictToLoggedCandidate = Boolean(loggedCid);
    try {
      const res = await fetch('https://python-k0xt.onrender.com/api/v1/test/attempts');
      if (!res.ok) {
        const txt = await res.text().catch(() => 'Failed');
        throw new Error(txt || 'Failed loading attempts');
      }
      const data = await res.json();
      console.log("DATA:",data)
      let mapped = (data.attempts || []).map(a => ({
          id: a.id || a.candidate_id || '—',
          // store candidate id so we can lookup canonical name from backend
          candidateId: a.candidate_id || a.details?.candidate_id || null,
          // preserve cid from attempt row for public lookup
          cid: a.cid ?? a.details?.cid ?? null,
          // will be replaced by server lookup below when possible
          name: 'Candidate',
          email: '',
          company: a.details?.company || '-',
          jobTitle: a.details?.role_title || '-',
          totalQuestion: Array.isArray(a.results_data) ? a.results_data.length : '-',
          // compute marks from results_data.score when available
          marks: (Array.isArray(a.results_data) && a.results_data.length) ? (() => {
            try {
              let obtained = 0;
              let possible = 0;
              for (const q of a.results_data) {
                if (!q) continue;
                const hasScoreField = q.score !== undefined && q.score !== null;
                const scoreVal = hasScoreField ? Number(q.score || 0) : null;
                const posMark = (q.positive_marking !== undefined && q.positive_marking !== null) ? Number(q.positive_marking) : null;
                const negMark = (q.negative_marking !== undefined && q.negative_marking !== null) ? Number(q.negative_marking) : null;

                if (scoreVal !== null) {
                  obtained += scoreVal;
                } else if (posMark !== null) {
                  // derive from raw_score/is_correct when score absent
                  if (q.is_correct) {
                    obtained += posMark;
                  } else if (negMark !== null) {
                    obtained -= Math.abs(negMark);
                  }
                } else if (q.raw_score !== undefined && q.raw_score !== null) {
                  // best-effort: assume raw_score in [0,1]
                  const raw = Number(q.raw_score) || 0;
                  obtained += raw;
                }

                if (posMark !== null) possible += posMark;
                else if (q.max_score !== undefined && q.max_score !== null) possible += Number(q.max_score);
                else possible += 1;
              }
              return `${obtained}/${possible}`;
            } catch (e) { return '-'; }
          })() : '-',
          skills: Array.isArray(a.details?.skills) ? a.details.skills : (a.details?.skills || []),
          time: '-',
          correct: '-',
          incorrect: '-',
          raw: a,
        }));
      // If a candidate is logged in, restrict visible attempts to that candidate's cid only
      if (restrictToLoggedCandidate) {
        const before = mapped.length;
        mapped = mapped.filter(m => {
          const attemptCid = m.cid ?? m.candidateId ?? m.raw?.candidate_id ?? m.raw?.cid ?? null;
          return attemptCid && String(attemptCid) === String(loggedCid);
        });
        if (mountedRef.current) console.log(`Report: restricted attempts from ${before} to ${mapped.length} for cid=${loggedCid}`);
      }

      if (mountedRef.current) setCandidates(mapped);

        // Try to resolve candidate names by calling candidate API route for each candidate_id
        try {
          // Prefer same API base as other calls (backend main API)
          const CAND_API_BASE = window.REACT_APP_BASE_URL || `${baseUrl}`;
          const token = localStorage.getItem('candidateToken') || localStorage.getItem('token') || null;
          console.log("token",token)

          const fetchName = async (candidateId) => {
            if (!candidateId) return null;
            try {
              const headers = { 'Content-Type': 'application/json' };
              if (token) headers['Authorization'] = `Bearer ${token}`;
              const r = await fetch(`${CAND_API_BASE}/api/candidate/public/${encodeURIComponent(candidateId)}`, { headers });
              if (!r.ok) return null;
              const j = await r.json();
              return j.candidate?.name || null;
            } catch (e) { return null; }
          };

          const promises = mapped.map(async (m) => {
            const cid = m.cid ?? m.candidateId ?? m.raw?.candidate_id ?? null;
            if (cid) {
              try {
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const r = await fetch(`${CAND_API_BASE}/api/candidate/public/${encodeURIComponent(cid)}`, { headers });
                if (r.ok) {
                  const j = await r.json();
                  const name = j.candidate?.name || j.name || null;
                  if (name) m.name = name;
                  m.email = j.candidate?.email || j.email || m.email || '';
                }
              } catch (e) {
                // ignore per-candidate failures
              }
            }

            // also fetch assessment metadata (title/role) from main API and use it as jobTitle when available
            try {
              const qset = m.raw?.question_set_id || m.raw?.questionSetId || m.raw?.question_setId || null;
              if (qset) {
                const API_ROOT = (window.REACT_APP_BASE_URL || 'https://python-k0xt.onrender.com').replace(/\/$/, '') + '/api/v1';
                try {
                  const ar = await fetch(`${API_ROOT}/question-set/${encodeURIComponent(qset)}/assessment`);
                  if (ar.ok) {
                    const aj = await ar.json();
                    if (aj && aj.status === 'success') {
                      m.jobTitle = aj.role_title || aj.title || m.jobTitle;
                      m.company = aj.company || m.company;
                    }
                  }
                } catch (e) {
                  // ignore assessment fetch failures
                }
              }
            } catch (e) {
              // ignore
            }

            return m;
          });

      const resolved = await Promise.all(promises);
      if (mountedRef.current) setCandidates(resolved);
    } catch (e) {
      console.warn('Candidate name resolution failed', e);
    }
    } catch (err) {
      console.error('Failed loading attempts', err);
      setError((err && err.message) ? String(err.message) : 'Failed loading attempts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadAttempts();
    return () => { mountedRef.current = false };
  }, []);

  const retryLoad = () => {
    setError(null);
    loadAttempts();
  };

  const filteredCandidates = candidates.filter((c) =>
    (c.name || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (!openModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenModal(false);
        setSelectedCandidate(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openModal]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className={`${loading ? 'filter blur-sm pointer-events-none' : ''} max-w-7xl mx-auto` }>
      <div className="flex flex-col sm:flex-row justify-between items-stretch gap-6 mb-8">
        
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-300 p-4 md:p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Candidates</h2>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:justify-end">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search by Name"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-3 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="absolute right-0 top-0 h-full px-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>

            <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white rounded-lg transition-colors hover:bg-gray-800 w-full sm:w-auto">
              <SlidersHorizontal className="w-5 h-5" />
              <span className="font-medium text-sm">Filter</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 shadow-md rounded-2xl">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Job Title</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Total Question</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Marks</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length > 0 ? (
                currentData.map((candidate, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4 text-sm text-gray-800">{candidate.id}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{candidate.name}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{candidate.jobTitle}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{candidate.totalQuestion}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{candidate.marks}</td>
                    <td className="py-4 px-4 space-x-2">
                      <button
                        onClick={async () => {
                          // build richer selectedCandidate before opening modal
                          const enriched = { ...candidate };
                          // try to fetch canonical name if it's missing or placeholder
                          if ((!enriched.name || enriched.name === 'Candidate') && enriched.candidateId) {
                              try {
                              const candidateCid = enriched.cid ?? enriched.raw?.cid ?? enriched.candidateId ?? null;
                              if (candidateCid) {
                                const r = await fetch(`${CAND_API_BASE}/api/candidate/public/${encodeURIComponent(candidateCid)}`);
                                if (r.ok) {
                                  const j = await r.json();
                                  enriched.name = j.candidate?.name || j.name || enriched.name;
                                  enriched.email = j.candidate?.email || j.email || enriched.email;
                                }
                              }
                            } catch (e) { /* ignore */ }
                          }
                          // compute additional derived fields from raw attempt if available
                              try {
                                const raw = enriched.raw || {};
                                // If qa_data exists, merge answers into results_data entries when missing
                                try {
                                  // Use results_data as authoritative source for answers (ignore qa_data)
                                  const sourceList = raw.results_data || raw.resultsData || [];
                                  if (Array.isArray(sourceList)) {
                                    sourceList.forEach(r => {
                                      try {
                                        // Prefer existing given_answer, otherwise fall back to candidate_answer or answer
                                        const cand = r.candidate_answer ?? r.candidateAnswer ?? r.candidateResponse ?? null;
                                        const ans = r.answer ?? r.correct_answer ?? null;
                                        if ((r.given_answer === undefined || r.given_answer === null || String(r.given_answer).trim() === '') &&
                                            cand !== null && String(cand).trim() !== '') {
                                          r.given_answer = cand;
                                        }
                                        if ((r.given_answer === undefined || r.given_answer === null || String(r.given_answer).trim() === '') &&
                                            ans !== null && String(ans).trim() !== '') {
                                          r.given_answer = ans;
                                        }
                                        // normalize other fields
                                        r.answer = r.answer ?? r.given_answer ?? r.candidate_answer ?? null;
                                        r.candidate_answer = r.candidate_answer ?? r.given_answer ?? r.answer ?? null;
                                      } catch (e) {
                                        // ignore normalization errors
                                      }
                                    });
                                  }
                                } catch (e) {
                                  // ignore merge errors
                                }

                                enriched.totalQuestion = Array.isArray(raw.results_data) ? raw.results_data.length : enriched.totalQuestion;
                            // derive marks: accumulate `score` when present, otherwise use positive/negative marking
                            if (Array.isArray(raw.results_data)) {
                              try {
                                let obtained = 0;
                                let possible = 0;
                                for (const q of raw.results_data) {
                                  if (!q) continue;
                                  const hasScoreField = q.score !== undefined && q.score !== null;
                                  const scoreVal = hasScoreField ? Number(q.score || 0) : null;
                                  const posMark = (q.positive_marking !== undefined && q.positive_marking !== null) ? Number(q.positive_marking) : null;
                                  const negMark = (q.negative_marking !== undefined && q.negative_marking !== null) ? Number(q.negative_marking) : null;

                                  if (scoreVal !== null) {
                                    obtained += scoreVal;
                                  } else if (posMark !== null) {
                                    if (q.is_correct) obtained += posMark;
                                    else if (negMark !== null) obtained -= Math.abs(negMark);
                                  } else if (q.raw_score !== undefined && q.raw_score !== null) {
                                    obtained += Number(q.raw_score) || 0;
                                  }

                                  if (posMark !== null) possible += posMark;
                                  else if (q.max_score !== undefined && q.max_score !== null) possible += Number(q.max_score);
                                  else possible += 1;
                                }
                                enriched.marks = `${obtained}/${possible}`;
                                enriched.correct = raw.results_data.filter(r => r && r.is_correct).length || undefined;
                                enriched.incorrect = Array.isArray(raw.results_data) ? raw.results_data.length - (enriched.correct || 0) : undefined;
                              } catch (e) { /* ignore */ }
                            }
                            enriched.time = raw.time_taken || enriched.time;
                          } catch (e) { /* ignore */ }

                          setSelectedCandidate(enriched);
                          setOpenModal(true);
                        }}
                        className="p-1.5 border border-blue-300 rounded hover:bg-blue-50"
                        aria-label="View Result"
                      >
                        <Eye size={16} className="text-blue-500" />
                      </button>
                      <button onClick={() => handleDelete(candidate)} className="p-1.5 border border-red-300 rounded hover:bg-red-50" aria-label="Delete">
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-gray-500">
                    No candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
              }}
            />
          )}
        </div>
      </div>

      {openModal && selectedCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-auto p-4 sm:p-6 bg-black/40"
          onClick={() => {
            setOpenModal(false);
            setSelectedCandidate(null);
          }}
        >
          <div
            className="relative w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              onClick={() => {
                setOpenModal(false);
                setSelectedCandidate(null);
              }}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                <section className="col-span-1 rounded-xl border border-gray-200 p-4 sm:p-6 lg:col-span-2">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-[120px] text-gray-600">ID</span>
                      <span className="font-medium text-gray-900">{selectedCandidate.id}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-[120px] text-gray-600">Name</span>
                      <span className="font-medium text-gray-900">{selectedCandidate.name}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-[120px] text-gray-600">Job Title</span>
                      <span className="font-medium text-gray-900">{selectedCandidate.jobTitle}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-[120px] text-gray-600">Total Questions</span>
                      <span className="font-medium text-gray-900">{selectedCandidate.totalQuestion} Questions</span>
                    </div>
                    
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-[120px] text-gray-600">Marks</span>
                      <span className="font-semibold text-green-600">
                        {selectedCandidate.marks ? selectedCandidate.marks.split('/')[0] : 0}/{selectedCandidate.marks ? selectedCandidate.marks.split('/')[1] : 0}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      <span className="min-w-[120px] text-gray-600">Skills</span>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(selectedCandidate.skills) && selectedCandidate.skills.length ? selectedCandidate.skills : ['Wireframing', 'Prototyping', 'User Research']).map((s, i) => (
                          <span key={`${s}-${i}`} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-[120px] text-gray-600">Correct Answer</span>
                      <span className="font-medium text-gray-900">{selectedCandidate.correct ?? '—'}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-[120px] text-gray-600">Incorrect Answer</span>
                      <span className="font-medium text-gray-900">{selectedCandidate.incorrect ?? '—'}</span>
                    </div>

                    <div className="pt-4">
                      <h3 className="text-sm font-medium text-gray-700">Attempt Details</h3>
                      <div className="mt-2 max-h-48 overflow-auto text-sm bg-gray-50 p-2 rounded">
                        {selectedCandidate.raw?.results_data && Array.isArray(selectedCandidate.raw.results_data) ? (
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-gray-600">
                                <th className="py-1 px-2">#</th>
                                <th className="py-1 px-2">Question</th>
                                <th className="py-1 px-2">Given Answer</th>
                                <th className="py-1 px-2">Correct?</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedCandidate.raw.results_data.map((r, i) => (
                                <tr key={i} className="odd:bg-white even:bg-gray-100">
                                  <td className="py-1 px-2 align-top">{i + 1}</td>
                                  <td className="py-1 px-2 align-top">{r.question || r.q_text || '-'} </td>
                                  <td className="py-1 px-2 align-top">{r.given_answer ?? r.answer ?? '-'}</td>
                                  <td className="py-1 px-2 align-top">{r.is_correct ? 'Yes' : 'No'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(selectedCandidate.raw || {}, null, 2)}</pre>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-gray-700">Percentage</span>
                        <span className="font-semibold text-green-600">
                          {(() => {
                            const scored = Number(selectedCandidate.marks?.split('/')[0]) || 0;
                            const max = Number(selectedCandidate.marks?.split('/')[1]) || 0;
                            return max ? Math.round((scored / max) * 100) : 0;
                          })()}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div 
                          className="h-full rounded-full bg-green-500" 
                          style={{ 
                            width: `${(() => {
                              const scored = Number(selectedCandidate.marks?.split('/')[0]) || 0;
                              const max = Number(selectedCandidate.marks?.split('/')[1]) || 0;
                              return max ? Math.round((scored / max) * 100) : 0;
                            })()}%` 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <aside className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-xl border border-gray-200 p-4 sm:p-6">
                    <p className="text-base font-semibold text-gray-800">Total Marks</p>
                    <p className="mt-2 text-4xl font-extrabold tracking-tight text-blue-600 sm:text-5xl">
                      {selectedCandidate.marks ? `${selectedCandidate.marks.split('/')[0]}/${selectedCandidate.marks.split('/')[1]}` : '0/0'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 sm:p-6">
                    <p className="text-base font-semibold text-gray-800">Total Questions</p>
                    <p className="mt-2 text-4xl font-extrabold tracking-tight text-blue-600 sm:text-5xl">
                      {selectedCandidate.totalQuestion ?? '-'}
                    </p>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay (match Results.jsx) */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white/90 rounded-lg p-6 flex flex-col items-center gap-3">
            <SpinLoader />
            <div className="text-sm text-gray-700">Loading tests...</div>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 p-4">
          <div className="max-w-lg w-full bg-white rounded-lg p-6 shadow">
            <h3 className="text-lg font-semibold mb-2">Failed to load data</h3>
            <p className="text-sm text-gray-600 mb-4">{String(error)}</p>
            <div className="flex gap-2">
              <button onClick={retryLoad} className="px-3 py-2 bg-blue-600 text-white rounded">Retry</button>
              <button onClick={() => setError(null)} className="px-3 py-2 bg-gray-100 rounded">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}

export default Report;