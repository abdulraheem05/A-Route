'use client';
// Specimen inspection: image, scan, result.
//
// Three stages, in order, and the objective is recorded only at the third.
// Opening the popup used to complete an inspect objective on its own, which
// meant a mission could be finished without looking at anything.
//
//   1  the actual image supplied for this target, with an INSPECT button
//   2  a scanning pass across that image
//   3  a compact analysis panel, built only from fields the data carries
//
// Nothing in the result is generated. Composition, finding and significance
// are printed only when the science record holds them; a row with no source is
// left out rather than filled in. Where no image was supplied for a target the
// panel says so instead of substituting another picture.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScanLine, Check } from 'lucide-react';
import { useGame } from '@/lib/store';

const SCAN_MS = 2600;

/**
 * Pulls the result rows out of a science record. Every value here comes from
 * the record as written; there is no fallback text that could read as a
 * finding the source does not support.
 */
export function analysisOf(obj = {}) {
  const evidence = Array.isArray(obj.evidence) ? obj.evidence : [];
  const firstEvidence = evidence.length ? evidence[0].text || evidence[0] : null;
  return {
    composition: obj.composition || obj.mineralogy || null,
    finding: obj.finding || obj.summary || firstEvidence || null,
    significance: obj.significance || obj.whyItMatters || null,
    context: obj.geologicalContext || obj.context || null,
    instrument: obj.instrument || null,
  };
}

function Row({ label, children }) {
  if (!children) return null;
  return (
    <div className="mt-5 first:mt-0">
      <div className="text-[11px] uppercase tracking-[.22em] text-mars-300">{label}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-mars-50 md:text-lg">{children}</p>
    </div>
  );
}

export default function SpecimenInspector({ item, obj, image, imageAlt, kindLabel, onDone }) {
  const [stage, setStage] = useState('ready'); // ready | scanning | done
  const timer = useRef(null);
  const analysis = analysisOf(obj);

  // A different specimen starts over.
  useEffect(() => {
    setStage('ready');
    return () => clearTimeout(timer.current);
  }, [item.id]);

  const startScan = useCallback(() => {
    if (stage !== 'ready') return;
    setStage('scanning');
    timer.current = setTimeout(() => {
      setStage('done');
      // The objective completes here, when the pass has actually finished.
      useGame.getState().recordEvent('inspect', item.id);
      if (onDone) onDone();
    }, SCAN_MS);
  }, [stage, item.id, onDone]);

  return (
    <div className="grid md:min-h-[420px] md:grid-cols-2">
      {/* ------------------------------------------------- the specimen */}
      <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden bg-black/35 p-4 md:min-h-[320px] md:p-6">
        {image ? (
          <figure className="relative w-full">
            <img
              src={image}
              alt={imageAlt || item.name}
              className={`max-h-[440px] w-full rounded-lg object-contain transition duration-700 ${
                stage === 'scanning' ? 'brightness-110 contrast-105' : ''
              }`}
            />
            {stage === 'scanning' && (
              <span className="specimen-scan" aria-hidden="true">
                <span className="specimen-scan-beam" />
                <span className="specimen-scan-grid" />
              </span>
            )}
            {stage === 'done' && (
              <span className="specimen-scan-done" aria-hidden="true">
                <Check size={14} />
                Scan complete
              </span>
            )}
          </figure>
        ) : (
          <div className="relative w-full rounded-lg border border-dashed border-mars-200/25 p-8 text-center">
            <p className="text-mars-200/70">No image of this target is published in this build.</p>
            <p className="mt-2 text-sm text-mars-200/45">
              The analysis below comes from the mission record, not from a picture.
            </p>
            {stage === 'scanning' && (
              <span className="specimen-scan" aria-hidden="true">
                <span className="specimen-scan-beam" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* --------------------------------------------------- the reading */}
      <div className="flex flex-col justify-center p-5 md:p-8 lg:p-10">
        {stage !== 'done' ? (
          <>
            <p className="mb-6 text-base leading-relaxed text-mars-50 md:mb-7 md:text-2xl">
              {obj.summary || obj.description || item.name}
            </p>
            {analysis.context && <p className="mb-6 text-sm leading-relaxed text-mars-100/75 md:mb-7 md:text-lg">{analysis.context}</p>}
            <button
              type="button"
              className="group flex w-full max-w-xs items-center justify-center gap-3 rounded-full border border-mars-300/40 bg-mars-500/15 px-5 py-3.5 text-base text-mars-50 transition hover:bg-mars-500/25 disabled:opacity-60 md:px-6 md:py-4 md:text-lg"
              onClick={startScan}
              disabled={stage === 'scanning'}
            >
              <ScanLine size={24} className={stage === 'scanning' ? 'animate-pulse' : ''} />
              <span>{stage === 'scanning' ? 'Scanning…' : `Inspect ${kindLabel || 'specimen'}`}</span>
            </button>
            {stage === 'scanning' && (
              <p className="mt-4 text-sm uppercase tracking-[.2em] text-mars-300">Analysis in progress</p>
            )}
          </>
        ) : (
          <div className="fade-in">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.22em] text-mars-300">
              <Check size={14} />
              {kindLabel === 'drill site' ? 'Drill sample analysis complete' : 'Rock analysis complete'}
            </div>
            <h3 className="mt-2 text-lg font-light leading-snug text-mars-50 md:text-2xl">{item.name}</h3>
            {analysis.instrument && <p className="mt-1 text-sm text-mars-200/60">{analysis.instrument}</p>}

            <div className="mt-6">
              <Row label="Composition">{analysis.composition}</Row>
              <Row label="Scientific finding">{analysis.finding}</Row>
              <Row label="Significance">{analysis.significance}</Row>
              {!analysis.composition && (
                <p className="mt-5 text-sm text-mars-200/45">
                  No measured composition is recorded for this target in this build.
                </p>
              )}
            </div>

            <button
              type="button"
              className="mt-7 w-full max-w-xs rounded-full border border-white/10 bg-black/40 px-5 py-3 text-base text-white transition hover:bg-black/60 md:mt-8 md:px-6 md:text-lg"
              onClick={() => useGame.getState().closeSite()}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
