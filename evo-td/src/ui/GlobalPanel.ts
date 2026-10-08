/** Globaler Shop: DNA, Run-Abrechnung, Karten-Erfolge und Artefakte (feste Reihenfolge). */
import { ARTIFACT_ORDER } from '../data/meta';
import type { Game } from '../game/Game';
import { overallBestWave } from '../game/MetaState';
import { MAPS } from '../data/map';
import {
  achievementStatus,
  artifactState,
  bestWaveOn,
  isMapUnlocked,
  canUnlockArtifact,
  metaLevel,
  metaUpgradeCostAt,
  metaValues,
} from '../game/systems/MetaSystem';
import { bulkButton, buyAmountBar, levelLabel, SubTabs } from './widgets';

type GlobalTab = 'artefakte' | 'karten' | 'run';
import { $, el, formatNumber } from './dom';
import { askConfirm } from './Confirm';

const ACH_LABEL = { damage: 'Schaden', fireRate: 'Feuerrate', dna: 'DNA' } as const;

/** Wie viele gesperrte Artefakte hinter dem nächsten noch angedeutet werden. */
const TEASER_COUNT = 1;

export class GlobalPanel {
  private readonly root = $('#global-panel');
  private lastKey = '';
  private readonly sub = new SubTabs<GlobalTab>('global', [['artefakte', 'Artefakte'], ['karten', 'Karten & Erfolge'], ['run', 'Run']], () => this.invalidate());

  constructor(
    private readonly game: Game,
    private readonly onEndRun: () => void,
    private readonly onSwitchMap: (mapId: string) => void,
  ) {}

  invalidate(): void {
    this.lastKey = '';
  }

  render(): void {
    const { meta } = this.game;
    const preview = this.game.dnaPreview();
    const key = JSON.stringify([this.sub.active, meta.buyAmount, meta.dna, meta.bestWaveByMap, meta.upgrades, meta.autoArtifacts, meta.autoFusionEnabled, preview.total, this.game.map.id]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    const values = metaValues(meta);

    // --- Kopf & Run beenden --------------------------------------------------
    const endButton = el('button', { className: 'btn warn' }, [`Run beenden: +${formatNumber(preview.total)} DNA`]);
    endButton.addEventListener('click', () => {
      void askConfirm(`Run jetzt beenden und ${preview.total} DNA kassieren? Der Run-Fortschritt geht verloren.`, 'Run beenden').then((ok) => ok && this.onEndRun());
    });

    // --- Karten ------------------------------------------------------------
    const maps = el('ul', { className: 'shop-list' });
    for (const map of MAPS) {
      const unlocked = isMapUnlocked(meta, map);
      const active = map.id === this.game.map.id;
      let control: Node;
      if (active) control = el('span', { className: 'muted small' }, ['aktiv']);
      else if (!unlocked) control = el('span', { className: 'muted small' }, [`🔒 ${MAPS.find((m) => m.id === map.unlock?.mapId)?.name ?? ''} Welle ${map.unlock?.wave ?? 0}`]);
      else {
        const b = el('button', { className: 'btn small' }, ['Spielen']);
        b.addEventListener('click', () => {
          const msg = preview.wave > 0
            ? `Zur Karte ${map.name} wechseln? Der laufende Run endet mit +${preview.total} DNA.`
            : `Zur Karte ${map.name} wechseln?`;
          void askConfirm(msg, 'Karte wechseln').then((ok) => ok && this.onSwitchMap(map.id));
        });
        control = b;
      }
      maps.append(
        el('li', { className: active ? 'artifact next' : unlocked ? '' : 'artifact locked' }, [
          el('span', {}, [el('strong', {}, [map.name]), el('span', { className: 'muted small' }, [` Bestwelle ${bestWaveOn(meta, map.id)}`])]),
          control,
          el('span', { className: 'desc' }, [map.description]),
        ]),
      );
    }

    // --- Erfolge -----------------------------------------------------------
    const achievements = el('ul', { className: 'shop-list' });
    for (const a of achievementStatus(meta)) {
      achievements.append(
        el('li', {}, [
          el('span', {}, [`🏆 ${a.mapName}: `, el('strong', {}, [`+${Math.round(a.bonus * 100)} % ${ACH_LABEL[a.kind]}`])]),
          el('span', { className: 'muted small' }, [`${a.milestones}×`]),
          el('span', { className: 'desc' }, [`Bestwelle ${a.bestWave}. Nächster Erfolg bei Welle ${a.nextAt} (+${Math.round((MAPS.find((m) => m.id === a.mapId)?.achievement.perMilestone ?? 0) * 100)} % ${ACH_LABEL[a.kind]}).`]),
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
      const controls: (Node | string)[] = [];
      if (def.maxLevel === 1) {
        controls.push(el('span', { className: 'muted small' }, ['aktiv']));
      } else {
        controls.push(
          bulkButton({
            meta,
            level,
            maxLevel: def.maxLevel,
            cost: (l) => metaUpgradeCostAt(def.id, l),
            budget: meta.dna,
            currency: '🧬',
            onBuy: () => {
              this.game.buyMetaUpgradeBulk(def.id);
              this.invalidate();
            },
          }),
        );
      }
      const row: (Node | string)[] = [
        el('span', {}, [`${def.icon} ${def.name} `, el('span', { className: 'muted' }, [def.maxLevel > 1 ? levelLabel(level, def.maxLevel) : ''])]),
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

    const content: Node[] =
      this.sub.active === 'artefakte'
        ? [
            el('p', { className: 'muted small' }, [
              'Feste Reihenfolge: das nächste Artefakt braucht das vorige, eine Bestwelle und DNA. Skalierbare Artefakte haben keine Obergrenze.',
            ]),
            buyAmountBar(meta, () => this.invalidate()),
            artifacts,
            el('div', { className: 'actions' }, extras),
          ]
        : this.sub.active === 'karten'
          ? [el('h3', {}, ['Karten']), maps, el('h3', {}, ['Erfolge']), achievements]
          : [
              el('p', {}, [
                `Dieser Run: Welle ${preview.wave}. Neue Wellen bringen ${formatNumber(preview.fromNewWaves)} DNA, `,
                `bereits erreichte nur ${formatNumber(preview.fromRepeatedWaves)}.`,
              ]),
              endButton,
            ];

    this.root.replaceChildren(
      el('h2', {}, [`🧬 ${formatNumber(meta.dna)} DNA`]),
      el('p', { className: 'muted small' }, [
        `Bestwelle ${overallBestWave(meta)} · ${meta.runs} Runs · ${formatNumber(meta.totalDnaEarned)} DNA insgesamt`,
      ]),
      this.sub.element(),
      ...content,
    );
  }
}
