/** Globaler Shop: DNA, Run-Abrechnung, Karten-Erfolge und Artefakte (feste Reihenfolge). */
import { ARTIFACT_ORDER } from '../data/meta';
import type { Game } from '../game/Game';
import { overallBestWave } from '../game/MetaState';
import {
  achievementStatus,
  artifactState,
  canUnlockArtifact,
  metaLevel,
  metaUpgradePrice,
  metaValues,
} from '../game/systems/MetaSystem';
import { $, el, formatNumber } from './dom';

/** Wie viele gesperrte Artefakte hinter dem nächsten noch angedeutet werden. */
const TEASER_COUNT = 1;

export class GlobalPanel {
  private readonly root = $('#global-panel');
  private lastKey = '';

  constructor(
    private readonly game: Game,
    private readonly onEndRun: () => void,
  ) {}

  invalidate(): void {
    this.lastKey = '';
  }

  render(): void {
    const { meta } = this.game;
    const preview = this.game.dnaPreview();
    const key = JSON.stringify([meta.dna, meta.bestWaveByMap, meta.upgrades, meta.autoArtifacts, meta.autoFusionEnabled, preview.total]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    const values = metaValues(meta);

    // --- Kopf & Run beenden --------------------------------------------------
    const endButton = el('button', { className: 'btn warn' }, [`Run beenden: +${formatNumber(preview.total)} DNA`]);
    endButton.addEventListener('click', () => {
      if (confirm(`Run jetzt beenden und ${preview.total} DNA kassieren? Der Run-Fortschritt geht verloren.`)) this.onEndRun();
    });

    // --- Erfolge -----------------------------------------------------------
    const achievements = el('ul', { className: 'shop-list' });
    for (const a of achievementStatus(meta)) {
      achievements.append(
        el('li', {}, [
          el('span', {}, [`🏆 ${a.mapName}: `, el('strong', {}, [`+${Math.round(a.bonus * 100)} % Schaden`])]),
          el('span', { className: 'muted small' }, [`${a.milestones}×`]),
          el('span', { className: 'desc' }, [`Bestwelle ${a.bestWave}. Nächster Erfolg bei Welle ${a.nextAt} (+10 % Schaden, eigener Topf).`]),
        ]),
      );
    }

    // --- Artefakte -----------------------------------------------------------
    const artifacts = el('ul', { className: 'shop-list' });
    let teasers = 0;
    let lockedHidden = 0;
    for (const def of ARTIFACT_ORDER) {
      const state = artifactState(meta, def.id);
      if (state === 'locked') {
        if (teasers < TEASER_COUNT) {
          teasers++;
          artifacts.append(
            el('li', { className: 'artifact locked' }, [
              el('span', {}, [`❔ Unbekanntes Artefakt`]),
              el('span', { className: 'muted small' }, [`ab Welle ${def.unlockWave}`]),
            ]),
          );
        } else {
          lockedHidden++;
        }
        continue;
      }

      if (state === 'next') {
        const ok = canUnlockArtifact(meta, def.id);
        const waveOk = overallBestWave(meta) >= def.unlockWave;
        const button = el('button', { className: 'btn small', disabled: !ok }, [`${formatNumber(def.unlockCost)} 🧬`]);
        button.addEventListener('click', () => {
          this.game.unlockArtifact(def.id);
          this.invalidate();
        });
        artifacts.append(
          el('li', { className: 'artifact next' }, [
            el('span', {}, [`${def.icon} ${def.name} `, el('span', { className: 'muted small' }, ['nächstes'])]),
            button,
            el('span', { className: 'desc' }, [
              def.description,
              waveOk ? '' : ` Benötigt Bestwelle ${def.unlockWave}.`,
            ]),
          ]),
        );
        continue;
      }

      // owned
      const level = metaLevel(meta, def.id);
      const price = metaUpgradePrice(meta, def.id);
      const controls: (Node | string)[] = [];
      if (price === undefined) {
        controls.push(el('span', { className: 'muted small' }, [def.maxLevel === 1 ? 'aktiv' : 'max']));
      } else {
        const button = el('button', { className: 'btn small', disabled: meta.dna < price }, [`${formatNumber(price)} 🧬`]);
        button.addEventListener('click', () => {
          this.game.buyMetaUpgrade(def.id);
          this.invalidate();
        });
        controls.push(button);
      }
      const row: (Node | string)[] = [
        el('span', {}, [`${def.icon} ${def.name} `, el('span', { className: 'muted' }, [def.maxLevel > 1 ? `${level}/${def.maxLevel}` : ''])]),
        el('span', { className: 'row-controls' }, controls),
        el('span', { className: 'desc' }, [def.description]),
      ];
      if (values.autoArtifacts && def.maxLevel > 1) {
        const box = el('input', { type: 'checkbox', checked: !!meta.autoArtifacts[def.id], title: 'Auto-Kauf am Run-Ende' });
        box.addEventListener('change', () => {
          meta.autoArtifacts[def.id] = box.checked;
          this.invalidate();
        });
        row.push(el('label', { className: 'toggle desc' }, [box, ' Auto-Kauf am Run-Ende']));
      }
      artifacts.append(el('li', { className: 'artifact owned' }, row));
    }
    if (lockedHidden > 0) {
      artifacts.append(el('li', { className: 'artifact locked' }, [el('span', { className: 'muted small' }, [`… und ${lockedHidden} weitere`])]));
    }

    const extras: Node[] = [];
    if (values.autoFusion) {
      const box = el('input', { type: 'checkbox', checked: meta.autoFusionEnabled });
      box.addEventListener('change', () => {
        this.game.setAutoFusion(box.checked);
        this.invalidate();
      });
      extras.push(el('label', { className: 'toggle' }, [box, ' Auto-Fusion aktiv']));
    }

    this.root.replaceChildren(
      el('h2', {}, [`🧬 ${formatNumber(meta.dna)} DNA`]),
      el('p', { className: 'muted small' }, [
        `Bestwelle ${overallBestWave(meta)} · ${meta.runs} Runs · ${formatNumber(meta.totalDnaEarned)} DNA insgesamt`,
      ]),
      el('p', {}, [
        `Dieser Run: Welle ${preview.wave}. Neue Wellen bringen ${formatNumber(preview.fromNewWaves)} DNA, `,
        `bereits erreichte nur ${formatNumber(preview.fromRepeatedWaves)}.`,
      ]),
      endButton,
      el('h2', { style: 'margin-top:14px' }, ['Erfolge']),
      achievements,
      el('h2', { style: 'margin-top:14px' }, ['Artefakte']),
      el('p', { className: 'muted small' }, [
        'Feste Reihenfolge: das nächste Artefakt braucht das vorige, eine Bestwelle und DNA. Evolutionen schaltest du im Stammbaum frei.',
      ]),
      artifacts,
      el('div', { className: 'actions' }, extras),
    );
  }
}
