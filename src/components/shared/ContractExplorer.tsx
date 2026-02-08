import { useState } from 'react';
import { ChevronDown, ChevronUp, Code2, Fuel } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { COSTON2_EXPLORER, FLARE_SHIELD_POLICY_ADDRESS } from '@/lib/flareContracts';

interface ContractExplorerProps {
  functionName: string;
  contractName?: string;
  params: Record<string, string | number>;
  estimatedGas?: string;
  value?: string;
}

export default function ContractExplorer({
  functionName,
  contractName = 'SatShieldPolicy',
  params,
  estimatedGas,
  value,
}: ContractExplorerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors"
      >
        <Code2 className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-muted-foreground">Smart Contract Call</span>
        <span className="font-mono text-primary ml-1">{functionName}()</span>
        <div className="ml-auto">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
              {/* Contract */}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Contract</span>
                <a
                  href={`${COSTON2_EXPLORER}/address/${FLARE_SHIELD_POLICY_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {contractName}
                </a>
              </div>

              {/* Parameters */}
              {Object.entries(params).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{key}</span>
                  <span className="font-mono text-foreground max-w-[200px] truncate">
                    {String(val)}
                  </span>
                </div>
              ))}

              {/* Value */}
              {value && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">msg.value</span>
                  <span className="font-mono-data text-warning">{value} C2FLR</span>
                </div>
              )}

              {/* Gas */}
              {estimatedGas && (
                <div className="flex justify-between text-xs pt-1 border-t border-border/20">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Fuel className="h-3 w-3" />
                    Est. Gas
                  </span>
                  <span className="font-mono text-muted-foreground">{estimatedGas}</span>
                </div>
              )}

              {/* Network badge */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                Coston2 Testnet · Chain ID 114
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
