import React from 'react';
import { Cpu, Lock, Sparkles, Keyboard, Database, ArrowDownUp, Save, ChevronDown, Zap } from 'lucide-react';

interface TutorialWizardProps {
  onClose: (neverShow?: boolean) => void;
}

const steps = [
  {
    title: "Welcome to Regex Pattern Matcher",
    icon: Sparkles,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
    content: (
      <div className="space-y-4">
        <p className="text-slate-600">
          Welcome to your powerful regex companion! This tool combines the power of AI with
          privacy-first design to help you create, manage, and transform text with regular expressions.
        </p>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Cpu className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Browser-Based AI</h3>
            <p className="text-slate-600">
              Our AI model (Qwen2.5) runs entirely in your browser. No data is ever sent to external servers,
              ensuring complete privacy and sovereignty over your data.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <Lock className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Privacy First</h3>
            <p className="text-slate-600">
              All processing happens locally on your device. Your patterns, text, and data never leave your browser.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Workspaces",
    icon: Save,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50",
    content: (
      <div className="space-y-4">
        <p className="text-slate-600">
          Workspaces help you organize different sets of patterns and texts. Perfect for managing multiple projects
          or different use cases.
        </p>
        <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Save className="w-4 h-4" />
            <span>Save current patterns and text as a workspace</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <ChevronDown className="w-4 h-4" />
            <span>Access and manage your saved workspaces</span>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600">
            Your workspaces are stored locally in your browser, ensuring privacy while maintaining persistence.
          </p>
        </div>
      </div>
    )
  },
  {
    title: "Regex Patterns",
    icon: ArrowDownUp,
    iconColor: "text-orange-500",
    bgColor: "bg-orange-50",
    content: (
      <div className="space-y-4">
        <p className="text-slate-600">
          Create powerful transformation pipelines by chaining multiple regex patterns together.
        </p>
        <div className="space-y-4">
          <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-lg">
            <div className="mt-1">1</div>
            <div>
              <h4 className="font-medium text-slate-900">Pattern Creation</h4>
              <p className="text-sm text-slate-600">
                Add multiple patterns that will be applied in sequence. Each pattern can have its own
                replacement text.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-lg">
            <div className="mt-1">2</div>
            <div>
              <h4 className="font-medium text-slate-900">Drag & Drop</h4>
              <p className="text-sm text-slate-600">
                Reorder patterns by dragging them to change the transformation sequence.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Pattern Library",
    icon: Database,
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-50",
    content: (
      <div className="space-y-4">
        <p className="text-slate-600">
          Save and reuse your most useful patterns across different workspaces.
        </p>
        <div className="space-y-4">
          <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-lg">
            <Save className="w-5 h-5 text-slate-700" />
            <div>
              <h4 className="font-medium text-slate-900">Save Patterns</h4>
              <p className="text-sm text-slate-600">
                Give your patterns meaningful names and save them for future use.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-lg">
            <ChevronDown className="w-5 h-5 text-slate-700" />
            <div>
              <h4 className="font-medium text-slate-900">Quick Access</h4>
              <p className="text-sm text-slate-600">
                Access your saved patterns from any workspace with a single click.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "AI-Powered Regex",
    icon: Keyboard,
    iconColor: "text-green-500",
    bgColor: "bg-green-50",
    content: (
      <div className="space-y-4">
        <p className="text-slate-600">
          Transform natural language descriptions into regex patterns using our built-in AI.
        </p>
        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
          <Zap className="w-5 h-5 text-yellow-500" />
          <div>
            <h4 className="font-medium text-slate-900">Natural Language to Regex</h4>
            <p className="text-sm text-slate-600">
              Simply describe what you want to match in plain English, and let our AI create the regex pattern for you.
              Click the ⚡️ button next to any pattern input to use this feature.
            </p>
            <div className="mt-2 p-3 bg-slate-100 rounded text-sm">
              <p className="text-slate-700">Example:</p>
              <p className="text-slate-600 italic">"match email addresses"</p>
              <p className="text-slate-600 font-mono mt-1">=&gt; [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]&#123;2,&#125;</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
];

export function TutorialWizard({ onClose }: TutorialWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [neverShow, setNeverShow] = React.useState(false);

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 ${currentStepData.bgColor} rounded-lg`}>
            <Icon className={`w-6 h-6 ${currentStepData.iconColor}`} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {currentStepData.title}
          </h2>
        </div>

        <div className="mb-8">
          {currentStepData.content}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-blue-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(step => step - 1)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(step => step + 1)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                Next
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={neverShow}
                    onChange={(e) => setNeverShow(e.target.checked)}
                    className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                  />
                  Don't show this page again
                </label>
                <button
                  onClick={() => {
                    if (neverShow) {
                      localStorage.setItem('neverShowTutorial', 'true');
                    }
                    onClose(neverShow);
                  }}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}