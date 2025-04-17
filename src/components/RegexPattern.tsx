import React, { useState, useEffect, useRef } from 'react';
import { Save, ChevronDown, GripVertical, Trash2, Zap } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SavedPattern {
  name: string;
  pattern: string;
  flags: string;
  replacement: string;
}

interface RegexPatternProps {
  id: string;
  pattern: string;
  flags: string;
  replacement: string;
  onPatternChange: (pattern: string) => void;
  onFlagsChange: (flags: string) => void;
  onReplacementChange: (replacement: string) => void;
  savedPatterns: SavedPattern[];
  onSavePattern: (name: string, pattern: string, flags: string, replacement: string) => void;
  onDeleteSavedPattern: (name: string) => void;
  transformToRegex: (description: string) => Promise<string>;
  modelStatus: 'loading' | 'failed' | 'ready';
}

interface Pattern {
  id: string;
  pattern: string;
  flags: string;
  replacement: string;
}

interface SortableRegexPatternProps {
  pattern: Pattern;
  onPatternChange: (pattern: string) => void;
  onFlagsChange: (flags: string) => void;
  onReplacementChange: (replacement: string) => void;
  onDelete: () => void;
  savedPatterns: SavedPattern[];
  onSavePattern: (name: string, pattern: string, flags: string, replacement: string) => void;
  onDeleteSavedPattern: (name: string) => void;
  transformToRegex: (description: string) => Promise<string>;
  modelStatus: 'loading' | 'failed' | 'ready';
}

export function SortableRegexPattern({
  pattern,
  onPatternChange,
  onFlagsChange,
  onReplacementChange,
  onDelete,
  savedPatterns,
  onSavePattern,
  onDeleteSavedPattern,
  transformToRegex,
  modelStatus,
}: SortableRegexPatternProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: pattern.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start group">
      <div 
        {...attributes} 
        {...listeners}
        className="mt-8 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>
      <div className="flex-1">
        <RegexPattern
          id={pattern.id}
          pattern={pattern.pattern}
          flags={pattern.flags}
          replacement={pattern.replacement}
          onPatternChange={onPatternChange}
          onFlagsChange={onFlagsChange}
          onReplacementChange={onReplacementChange}
          savedPatterns={savedPatterns}
          onSavePattern={onSavePattern}
          onDeleteSavedPattern={onDeleteSavedPattern}
          transformToRegex={transformToRegex}
          modelStatus={modelStatus}
        />
      </div>
      <button
        onClick={onDelete}
        className="p-2 mt-8 text-red-500 hover:bg-red-50 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export function RegexPattern({
  id,
  pattern,
  flags,
  replacement,
  onPatternChange,
  onFlagsChange,
  onReplacementChange,
  savedPatterns,
  onSavePattern,
  onDeleteSavedPattern,
  transformToRegex,
  modelStatus,
}: RegexPatternProps) {
  const [localPattern, setLocalPattern] = useState(pattern);
  const [localReplacement, setLocalReplacement] = useState(replacement);
  const [localFlags, setLocalFlags] = useState(flags);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [isTransforming, setIsTransforming] = useState(false);
  const [showFlagsTooltip, setShowFlagsTooltip] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronisation prompte des valeurs locales quand les props changent
  useEffect(() => {
    setLocalPattern(pattern);
  }, [pattern]);

  useEffect(() => {
    setLocalReplacement(replacement);
  }, [replacement]);

  // **Ajouté :** synchronisation des flags
  useEffect(() => {
    setLocalFlags(flags);
  }, [flags]);

  // Fermer le dropdown en cliquant hors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePatternSelect = (saved: SavedPattern) => {
    setLocalPattern(saved.pattern);
    setLocalFlags(saved.flags || '');
    setLocalReplacement(saved.replacement);
    onPatternChange(saved.pattern);
    onFlagsChange(saved.flags || '');
    onReplacementChange(saved.replacement);
    setShowDropdown(false);
  };

  const handleLocalPatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPattern = e.target.value;
    setLocalPattern(newPattern);
    requestAnimationFrame(() => onPatternChange(newPattern));
  };

  const handleLocalReplacementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newReplacement = e.target.value;
    setLocalReplacement(newReplacement);
    requestAnimationFrame(() => onReplacementChange(newReplacement));
  };

  const toggleFlag = (flag: string) => {
    const newFlags = localFlags.includes(flag)
      ? localFlags.replace(flag, '')
      : localFlags + flag;
    setLocalFlags(newFlags);
    requestAnimationFrame(() => onFlagsChange(newFlags));
  };

  const flagDescriptions: Record<string, string> = {
    g: 'Global: Find all matches',
    m: 'Multiline: ^ and $ match line starts/ends',
    i: 'Case insensitive',
    y: 'Sticky: Match from lastIndex',
    u: 'Unicode: Full Unicode support',
    v: 'Unicode Sets: Advanced Unicode features',
    s: 'DotAll: Dot matches newlines',
    d: 'Indices: Return match positions'
  };

  const handleMagicTransform = async () => {
    if (modelStatus === 'loading') {
      alert("Model is still loading, please wait...");
      return;
    }
    try {
      setIsTransforming(true);
      const regex = await transformToRegex(localPattern);
      setLocalPattern(regex);
      onPatternChange(regex);
    } catch (error) {
      console.error("Error during magic transform:", error);
      alert("Failed to transform description to regex. Please try rephrasing your description.");
    } finally {
      setIsTransforming(false);
    }
  };

  const savePattern = () => {
    const trimmedName = patternName.trim();
    if (!trimmedName || !localPattern.trim()) return;
    onSavePattern(trimmedName, localPattern, localFlags, localReplacement);
    setIsModalOpen(false);
    setPatternName('');
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 bg-white p-4 rounded-lg shadow-sm" data-pattern-id={id}>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Regex Pattern</label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={localPattern}
                onChange={!isTransforming ? handleLocalPatternChange : undefined}
                disabled={isTransforming}
                placeholder="Enter regex pattern or natural language description"
                className={`h-10 min-w-0 flex-1 px-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isTransforming ? 'bg-slate-50 cursor-not-allowed' : ''
                }`}
              />
              <div className="flex items-center gap-2 shrink-0">
                {modelStatus === 'ready' && (
                  <button
                    type="button"
                    onClick={handleMagicTransform}
                    disabled={isTransforming}
                    className={`h-10 w-10 border rounded-lg text-white group relative flex items-center justify-center ${
                      isTransforming ? 'bg-green-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                    }`}
                    title="Transform description to regex"
                  >
                    {isTransforming ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Transform text to regex pattern using AI
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="h-10 w-10 bg-white border rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-center"
                  title="Save pattern"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDropdown(prev => !prev)}
                  className="h-10 w-10 bg-white border rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-center relative"
                >
                  <ChevronDown className="w-4 h-4" />
                  {showDropdown && savedPatterns.length > 0 && (
                    <div ref={dropdownRef} className="absolute right-0 top-full mt-1 w-64 bg-white border rounded-lg shadow-lg z-[9999]">
                      <ul className="py-1">
                        {savedPatterns.map((saved, index) => (
                          <li key={index} className="px-4 py-2 hover:bg-slate-50 group">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSavedPattern(saved.name);
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="flex-1 cursor-pointer" onClick={() => handlePatternSelect(saved)}>
                                <div className="font-medium text-left">{saved.name}</div>
                                <div className="space-y-1">
                                  <div className="text-sm text-slate-500 font-mono max-w-[200px] truncate text-left" title={saved.pattern}>
                                    {saved.pattern}
                                  </div>
                                  <div className="text-xs text-slate-400 max-w-[200px] truncate text-left" title={`Replacement: ${saved.replacement}`}>
                                    Replacement: {saved.replacement}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowFlagsTooltip(true)}
                  onMouseLeave={() => setShowFlagsTooltip(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Flags:
                </button>
                {showFlagsTooltip && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg z-[9999]">
                    {Object.entries(flagDescriptions).map(([flag, desc]) => (
                      <div key={flag} className="flex items-start gap-2 mb-1 last:mb-0">
                        <code className="font-mono bg-slate-700 px-1 rounded">{flag}</code>
                        <span>{desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {Object.keys(flagDescriptions).map(flag => (
                <button
                  key={flag}
                  type="button"
                  onClick={() => toggleFlag(flag)}
                  className={`px-2 py-1 text-xs font-mono rounded ${
                    localFlags.includes(flag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={flagDescriptions[flag]}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Replacement Pattern</label>
          <input
            type="text"
            value={localReplacement}
            onChange={handleLocalReplacementChange}
            placeholder="Enter replacement pattern (e.g., $&, $1, or replacement text)"
            className="w-full h-10 px-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Save Pattern</h3>
            <input
              type="text"
              value={patternName}
              onChange={(e) => setPatternName(e.target.value)}
              placeholder="Enter a name for this pattern"
              className="w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mb-4 text-sm text-slate-600">
              <div>Pattern: <code className="bg-slate-100 px-2 py-1 rounded">{localPattern}</code></div>
              <div>Flags:   <code className="bg-slate-100 px-2 py-1 rounded">{localFlags}</code></div>
              <div>Replacement: <code className="bg-slate-100 px-2 py-1 rounded">{localReplacement}</code></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg">Cancel</button>
              <button onClick={savePattern} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
