import React, { useState, useEffect, useCallback } from 'react';
import { Copy, CopyCheck, Plus, Trash2, Trash, GripVertical, Save, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { RegexPattern, SavedPattern, SortableRegexPattern } from './components/RegexPattern';
import { TutorialWizard } from './components/TutorialWizard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface PatternState {
  id: string;
  pattern: string;
  flags: string;
  replacement: string;
}

interface Workspace {
  name: string;
  text: string;
  patterns: PatternState[];
}

const MODEL_CONFIGS = {
  default: { name: "Qwen2.5-0.5B-Instruct-q0f32-MLC", description: "Standard model" },
  fallback: { name: "Qwen1.5-0.5B-Chat-q0f16-MLC", description: "Lightweight fallback model" }
};

function App() {
  // --- États principaux ---
  const [showTutorial, setShowTutorial] = useState(() => localStorage.getItem('neverShowTutorial') !== 'true');
  const [text, setText] = useState('');
  const [matches, setMatches] = useState<string[]>([]);
  const [transformedText, setTransformedText] = useState('');
  const [showTransformed, setShowTransformed] = useState(false);
  const [error, setError] = useState('');
  const [copyAllStatus, setCopyAllStatus] = useState<'idle' | 'copied'>('idle');
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>([]);
  const [patterns, setPatterns] = useState<PatternState[]>([{ id: '1', pattern: '', flags: 'g', replacement: '' }]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // --- Modaux & dropdowns ---
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingPatterns, setClearingPatterns] = useState(false);

  // --- MLC / WebGPU ---
  const [qwenEngine, setQwenEngine] = useState<any>(null);
  const [modelStatus, setModelStatus] = useState<'loading' | 'failed' | 'ready'>('loading');
  const [deviceLostError, setDeviceLostError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [usingFallbackModel, setUsingFallbackModel] = useState(false);
  const MAX_RETRIES = 3, BASE_RETRY_DELAY = 4_000;

  // --- Drag & Drop sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Effet de chargement initial depuis localStorage ---
  useEffect(() => {
    const sp = localStorage.getItem('savedPatterns');
    const ws = localStorage.getItem('workspaces');
    if (sp) setSavedPatterns(JSON.parse(sp));
    if (ws) setWorkspaces(JSON.parse(ws));
  }, []);

  // --- Gestion du moteur Qwen / WebGPU (inchangé par rapport à la version précédente) ---
  useEffect(() => {
    let deviceErrorHandled = false;
    let deviceLostHandled = false;

    const checkWebGPU = async () => {
      if (!navigator.gpu) return false;
      const adapter = await navigator.gpu.requestAdapter().catch(() => null);
      return !!adapter;
    };

    const loadEngine = async () => {
      const available = await checkWebGPU();
      if (!available) {
        setDeviceLostError('WebGPU non disponible');
        setModelStatus('failed');
        return;
      }
      setModelStatus('loading');
      if (qwenEngine) {
        await qwenEngine.dispose().catch(() => {});
        setQwenEngine(null);
      }
      const config = usingFallbackModel ? MODEL_CONFIGS.fallback : MODEL_CONFIGS.default;
      try {
        const engine = await CreateMLCEngine(config.name, {
          initProgressCallback: () => {},
          deviceErrorCallback: (err) => {
            if (deviceErrorHandled) return;
            deviceErrorHandled = true;
            setDeviceLostError(err.message || 'GPU device lost');
            setModelStatus('failed');
            setQwenEngine(null);
            if (!usingFallbackModel && retryCount >= MAX_RETRIES) {
              setUsingFallbackModel(true);
              setRetryCount(0);
              setTimeout(loadEngine, BASE_RETRY_DELAY);
            } else if (retryCount < MAX_RETRIES) {
              setTimeout(() => setRetryCount(c => c + 1), BASE_RETRY_DELAY * 2 ** retryCount);
            }
          }
        });
        engine.device?.addEventListener('uncapturederror', e => e.preventDefault());
        engine.device?.addEventListener('lost', (info) => {
          if (deviceLostHandled) return;
          deviceLostHandled = true;
          setDeviceLostError('GPU device lost (mémoire insuffisante?)');
          setModelStatus('failed');
          setQwenEngine(null);
          if (!usingFallbackModel && retryCount >= MAX_RETRIES) {
            setUsingFallbackModel(true);
            setRetryCount(0);
            setTimeout(loadEngine, BASE_RETRY_DELAY);
          } else if (retryCount < MAX_RETRIES) {
            setTimeout(() => setRetryCount(c => c + 1), BASE_RETRY_DELAY * 2 ** retryCount);
          }
        });
        setQwenEngine(engine);
        setModelStatus('ready');
        setRetryCount(0);
      } catch (err) {
        setDeviceLostError((err as Error).message || 'Échec initialisation modèle');
        setModelStatus('failed');
      }
    };

    loadEngine();
  }, [retryCount, usingFallbackModel]);

  // --- Transformation NL → regex via Qwen ---
  const transformToRegex = async (desc: string): Promise<string> => {
    if (!qwenEngine) throw new Error(deviceLostError || 'Modèle indisponible');
    const messages = [
      { role: "system", content: "Output ONLY JSON {\"regex\":\"...\"}" },
      { role: "user", content: desc }
    ];
    const reply = await qwenEngine.chat.completions.create({ messages, temperature: 0, stream: false, max_tokens: 100 });
    let out = reply.choices[0].message.content.trim().replace(/^```json\n?|\n?```$/g, '');
    try { return JSON.parse(out).regex; }
    catch {
      const fix = out.replace(/\\/g, '\\\\').replace(/\\\\"/g, '\\"');
      return JSON.parse(fix).regex;
    }
  };

  // --- Fonctions CRUD patterns et workspaces ---
  const savePattern = (name: string, pattern: string, flags: string, replacement: string) => {
    const np = { name, pattern, flags, replacement };
    const arr = [...savedPatterns, np];
    setSavedPatterns(arr);
    localStorage.setItem('savedPatterns', JSON.stringify(arr));
  };
  const deleteSavedPattern = (name: string) => {
    const arr = savedPatterns.filter(p => p.name !== name);
    setSavedPatterns(arr);
    localStorage.setItem('savedPatterns', JSON.stringify(arr));
  };
  const clearSavedPatterns = () => {
    setClearingPatterns(true);
    localStorage.removeItem('savedPatterns');
    setSavedPatterns([]);
    setTimeout(() => setClearingPatterns(false), 1_000);
  };

  const addPattern = () => {
    setPatterns(ps => [...ps, { id: Math.random().toString(36).slice(2), pattern: '', flags: 'g', replacement: '' }]);
  };
  const updatePattern = (id: string, field: 'pattern'|'replacement', value: string) => {
    setPatterns(ps => ps.map(p => p.id === id ? { ...p, [field]: value } : p));
    findMatches();
  };
  const updateFlags = (id: string, flags: string) => {
    setPatterns(ps => ps.map(p => p.id === id ? { ...p, flags } : p));
    findMatches();
  };
  const deletePattern = (id: string) => {
    setPatterns(ps => ps.length>1 ? ps.filter(p=>p.id!==id) : ps);
  };

  // --- Fonction de recherche / transformation linéaire ---
  const findMatches = useCallback(() => {
    if (!text) {
      setMatches([]); setTransformedText(''); setError('');
      return;
    }
    try {
      let cur = text;
      const all: string[] = [];
      for (const {pattern, flags, replacement} of patterns) {
        const rx = new RegExp(pattern, flags);
        all.push(...Array.from(cur.matchAll(rx), m => m[0]));
        cur = cur.replace(rx, replacement);
      }
      setMatches(all);
      setTransformedText(cur);
      setError('');
    } catch {
      setError('Pattern invalide');
      setMatches([]); setTransformedText('');
    }
  }, [patterns, text]);

  useEffect(() => { findMatches(); }, [patterns, text, findMatches]);

  // --- Gestion workspaces (inclut deleteWorkspace !) ---
  const saveWorkspace = () => {
    if (!workspaceName.trim()) return;
    const ws = [...workspaces, { name: workspaceName.trim(), text, patterns }];
    setWorkspaces(ws);
    localStorage.setItem('workspaces', JSON.stringify(ws));
    setWorkspaceName('');
    setShowWorkspaceModal(false);
  };
  const loadWorkspace = (w: Workspace) => {
    setText(w.text);
    setPatterns(w.patterns);
    setShowWorkspaceDropdown(false);
  };
  const deleteWorkspace = (name: string) => {
    const ws = workspaces.filter(w=>w.name!==name);
    setWorkspaces(ws);
    localStorage.setItem('workspaces', JSON.stringify(ws));
  };

  // --- Copie au presse-papier ---
  const copyMatch = async (m: string) => { await navigator.clipboard.writeText(m); };
  const copyAllMatches = async () => {
    await navigator.clipboard.writeText(matches.join('\n'));
    setCopyAllStatus('copied');
    setTimeout(() => setCopyAllStatus('idle'), 2_000);
  };
  const copyTransformed = async () => { await navigator.clipboard.writeText(transformedText); };

  // --- JSX de rendu ---
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      { showTutorial && <TutorialWizard onClose={never=>{setShowTutorial(false); never&&localStorage.setItem('neverShowTutorial','true');}} /> }
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Regex Pattern Matcher</h1>

        {/* Barre d’outils patterns / workspaces */}
        <div className="flex items-center justify-between">
          <div>
            { modelStatus==='loading' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full" />
                <span>Loading {usingFallbackModel?'lightweight':''} AI model...</span>
              </div>
            )}
            { modelStatus==='failed' && (
              <a href="https://toji.github.io/webgpu-test/" target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 px-4 py-2 bg-red-50 border rounded-lg text-red-700">
                <AlertTriangle className="w-4 h-4" />
                AI features unavailable
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <button onClick={()=>setShowWorkspaceDropdown(d=>!d)}
                      className="px-4 py-2 bg-white border rounded-lg flex items-center gap-2">
                Workspaces <ChevronDown className="w-4 h-4" />
              </button>
              { showWorkspaceDropdown && workspaces.length>0 && (
                <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10">
                  <ul className="py-1">
                    {workspaces.map((w,i)=>(
                      <li key={i} className="px-4 py-2 hover:bg-slate-50 flex justify-between items-center">
                        <button onClick={()=>loadWorkspace(w)} className="flex-1 text-left">
                          <div className="font-medium">{w.name}</div>
                          <div className="text-sm text-slate-500">{w.patterns.length} patterns</div>
                        </button>
                        <button onClick={()=>deleteWorkspace(w.name)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={()=>setShowWorkspaceModal(true)}
                    className="px-4 py-2 bg-white border rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Workspace
            </button>
            <button onClick={()=>setShowClearConfirm(true)}
                    disabled={!savedPatterns.length}
                    className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${clearingPatterns?'bg-red-50':''}`}>
              <Trash2 className="w-4 h-4" /> Clear Saved
            </button>
            <button onClick={addPattern}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Pattern
            </button>
          </div>
        </div>

        {/* Liste des patterns triables */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={ev=>{
          const {active, over} = ev;
          if(active.id!==over?.id){
            setPatterns(ps=>arrayMove(ps,
              ps.findIndex(x=>x.id===active.id),
              ps.findIndex(x=>x.id===over.id)
            ));
          }
        }}>
          {patterns.map(pattern => (
            <SortableRegexPattern
              key={pattern.id}
              pattern={pattern}
              onPatternChange={(value) => updatePattern(pattern.id, 'pattern', value)}
              onFlagsChange={(flags) => updateFlags(pattern.id, flags)}
              onReplacementChange={(value) => updatePattern(pattern.id, 'replacement', value)}
              onDelete={() => deletePattern(pattern.id)}
              savedPatterns={savedPatterns}
              onSavePattern={(name, pattern, flags, replacement) =>
                savePattern(name, pattern, flags, replacement)
              }
              onDeleteSavedPattern={deleteSavedPattern}
              transformToRegex={transformToRegex}
              modelStatus={modelStatus}
            />
          ))}
        </DndContext>

        {/* Zone de texte */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Text to Search</label>
          <textarea value={text}
                    onChange={e=>setText(e.target.value)}
                    className="w-full h-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Erreur regex */}
        { error && (
          <div className="p-4 bg-red-50 border rounded-lg text-red-700">{error}</div>
        ) }

        {/* Transformed Text */}
        { text && patterns[0].pattern && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 bg-slate-100 border-b flex justify-between">
              <h2 className="text-lg font-medium">Transformed Text</h2>
              <div className="flex gap-2">
                <button onClick={()=>setShowTransformed(s=>!s)} className="px-4 py-2 border rounded-lg">
                  {showTransformed?'Hide':'Show'}
                </button>
                <button onClick={copyTransformed} className="flex items-center gap-2 px-4 py-2 border rounded-lg">
                  <Copy className="w-4 h-4"/><span>Copy</span>
                </button>
              </div>
            </div>
            { showTransformed && (
              <div className="p-4"><pre className="whitespace-pre-wrap font-mono text-sm">{transformedText}</pre></div>
            ) }
          </div>
        )}

        {/* Matches */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 bg-slate-100 border-b flex justify-between">
            <h2 className="text-lg font-medium">Matches ({matches.length})</h2>
            { matches.length>0 && (
              <button onClick={copyAllMatches} className="flex items-center gap-2 px-4 py-2 border rounded-lg">
                {copyAllStatus==='copied' ? <CopyCheck className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                Copy All
              </button>
            )}
          </div>
          { matches.length>0 ? (
            <ul className="divide-y">
              {matches.map((m,i)=>(
                <li key={i} className="p-4 flex justify-between">
                  <code className="font-mono">{m}</code>
                  <button onClick={()=>copyMatch(m)} className="p-2 rounded-lg hover:bg-slate-100">
                    <Copy className="w-4 h-4"/>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-slate-500">No matches found</div>
          )}
        </div>
      </div>

      {/* Modaux Save Workspace / Clear Saved */}
      { showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Clear Saved Patterns</h3>
            <p>Voulez‑vous vraiment tout supprimer ? Cette action est irréversible.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={()=>setShowClearConfirm(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={clearSavedPatterns} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Clear All</button>
            </div>
          </div>
        </div>
      )}
      { showWorkspaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Save Workspace</h3>
            <input value={workspaceName}
                   onChange={e=>setWorkspaceName(e.target.value)}
                   placeholder="Nom du workspace"
                   className="w-full px-4 py-2 border rounded-lg mb-4" />
            <div className="mb-4 text-sm text-slate-600">
              <div>Nombre de patterns : {patterns.length}</div>
              <div>Longueur du texte : {text.length} caractères</div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowWorkspaceModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={saveWorkspace} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-sm text-slate-600">
        Made with <span className="text-red-500">❤</span> by <a href="https://p2enjoy.studio" target="_blank" rel="noopener noreferrer" className="text-blue-500">P2Enjoy</a>
      </footer>
    </div>
  );
}

export default App;
